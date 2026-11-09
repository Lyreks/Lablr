package com.lablr.backend.label;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Label;
import com.lablr.backend.gmail.GmailErrors;
import com.lablr.backend.label.NestedRenameException.Rename;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import static com.lablr.backend.label.GmailLabels.CURRENT_USER;
import static com.lablr.backend.label.GmailLabels.all;
import static com.lablr.backend.label.GmailLabels.copyOf;

// Renames and deletes that have to take nested labels along
@Component
class NestedLabelChanges {

	private static final Logger logger = LoggerFactory.getLogger(NestedLabelChanges.class);

	/**
	 * Gmail doesn't rename child labels with their parent, so we do: "Work" -> "Archive/Work" also
	 * moves "Work/Invoices" to "Archive/Work/Invoices". There are no transactions, so if a child
	 * rename fails we undo the ones already done.
	 */
	Label rename(Gmail.Users.Labels labels, Label before, UpdateLabelRequest request) throws IOException {
		String id = before.getId();
		List<Label> all = all(labels);
		List<Label> children = childrenOf(all, before);
		checkFree(all, Stream.concat(Stream.of(before), children.stream()),
				renames(children, before.getName(), request.name()));
		Label updated = labels.patch(CURRENT_USER, id, request.toGmail()).execute();
		logger.debug("Renamed label {} \"{}\" -> \"{}\"{}", id, before.getName(), updated.getName(),
				children.isEmpty() ? "" : ", moving %d nested labels with it".formatted(children.size()));
		if (!children.isEmpty()) {
			logger.info("Renaming label {} and {} nested labels", id, children.size());
			renameAll(labels, renames(children, before.getName(), updated.getName()),
					() -> restore(labels, before, updated));
			logger.debug("Moved {} nested labels with label {}", children.size(), id);
		}
		return updated;
	}

	/**
	 * Gmail only deletes the label itself and leaves anything nested under it, so either delete
	 * those too or move them up a level: deleting "Work/Clients" turns "Work/Clients/Acme" into
	 * "Work/Acme".
	 */
	void delete(Gmail.Users.Labels labels, Label label, boolean deleteNested) throws IOException {
		List<Label> all = all(labels);
		List<Label> children = childrenOf(all, label);
		if (children.isEmpty()) {
			labels.delete(CURRENT_USER, label.getId()).execute();
			logger.debug("Deleted label {} \"{}\"", label.getId(), label.getName());
		}
		else if (deleteNested) {
			deleteAll(labels, label, children);
		}
		else {
			deleteMovingChildrenUp(labels, all, label, children);
		}
	}

	private void deleteMovingChildrenUp(Gmail.Users.Labels labels, List<Label> all, Label label,
			List<Label> children) {
		String parent = parentName(label.getName());
		List<ChildRename> renames = renames(children, label.getName(), parent);
		// The label itself still exists while its children move
		checkFree(all, children.stream(), renames);
		logger.info("Deleting label {} and moving {} nested labels up", label.getId(), children.size());
		logger.debug("Deleting label {} \"{}\", moving {} nested labels {}", label.getId(), label.getName(),
				children.size(), parent.isEmpty() ? "to the top level" : "up to \"%s\"".formatted(parent));
		renameAll(labels, renames, List::of);
		try {
			labels.delete(CURRENT_USER, label.getId()).execute();
		}
		catch (IOException ex) {
			logger.debug("Deleting label {} \"{}\" failed, moving its {} nested labels back", label.getId(),
					label.getName(), renames.size());
			logger.warn("Deleting label {} failed, moving its nested labels back", label.getId(), ex);
			throw new NestedRenameException("delete “%s”".formatted(label.getName()), GmailErrors.reason(ex),
					undo(labels, renames), ex);
		}
		logger.debug("Deleted label {} \"{}\" after moving {} nested labels", label.getId(), label.getName(),
				children.size());
	}

	// Deepest first, the label itself last. Deletes can't be undone, so a failure reports what's gone.
	private void deleteAll(Gmail.Users.Labels labels, Label label, List<Label> children) {
		List<Label> order = new ArrayList<>(children);
		order.sort(Comparator.comparingLong((Label child) -> child.getName().chars().filter((c) -> c == '/').count())
			.reversed());
		order.add(label);
		logger.info("Deleting label {} and {} nested labels", label.getId(), children.size());
		logger.debug("Deleting label {} \"{}\" and its {} nested labels", label.getId(), label.getName(),
				children.size());
		List<String> deleted = new ArrayList<>();
		for (Label each : order) {
			try {
				labels.delete(CURRENT_USER, each.getId()).execute();
				deleted.add(each.getName());
				logger.debug("Deleted label {} \"{}\" ({} of {})", each.getId(), each.getName(), deleted.size(),
						order.size());
			}
			catch (IOException ex) {
				logger.debug("Deleting label {} \"{}\" failed after {} of {} deletes; those can't be undone",
						each.getId(), each.getName(), deleted.size(), order.size());
				logger.warn("Deleting nested label {} failed after {} deletes", each.getId(), deleted.size(), ex);
				String gone = deleted.isEmpty() ? "Nothing was deleted."
						: "Already deleted: " + deleted.stream().map("“%s”"::formatted).collect(Collectors.joining(", "))
								+ ".";
				throw new ResponseStatusException(GmailErrors.status(ex), "Couldn't delete “%s”: %s. %s"
					.formatted(each.getName(), stripPeriod(GmailErrors.reason(ex)), gone), ex);
			}
		}
	}

	private static List<Label> childrenOf(List<Label> all, Label parent) {
		String prefix = parent.getName() + "/";
		return all.stream().filter((label) -> label.getName().startsWith(prefix)).toList();
	}

	private static List<ChildRename> renames(List<Label> children, String oldParent, String newParent) {
		return children.stream()
			.map((child) -> new ChildRename(child.getId(),
					new Rename(child.getName(), renamed(child.getName(), oldParent, newParent))))
			.toList();
	}

	// Fails fast if a new name is taken, instead of Gmail rejecting it halfway through.
	private static void checkFree(List<Label> all, Stream<Label> moving, List<ChildRename> renames) {
		Set<String> movingIds = moving.map(Label::getId).collect(Collectors.toSet());
		Set<String> taken = all.stream()
			.filter((label) -> !movingIds.contains(label.getId()))
			.map(Label::getName)
			.collect(Collectors.toSet());
		for (ChildRename rename : renames) {
			if (taken.contains(rename.names().to())) {
				logger.debug("Rejected change: nested label {} \"{}\" would become \"{}\", which is taken", rename.id(),
						rename.names().from(), rename.names().to());
				throw new ResponseStatusException(HttpStatus.CONFLICT,
						"“%s” would become “%s”, which already exists. Nothing was changed."
							.formatted(rename.names().from(), rename.names().to()));
			}
		}
	}

	// On failure, undoes what's done plus whatever undoAlso restores, then throws.
	private void renameAll(Gmail.Users.Labels labels, List<ChildRename> renames, Supplier<List<Rename>> undoAlso) {
		List<ChildRename> done = new ArrayList<>();
		for (ChildRename rename : renames) {
			try {
				labels.patch(CURRENT_USER, rename.id(), new Label().setName(rename.names().to())).execute();
				done.add(rename);
				logger.debug("Moved nested label {} \"{}\" -> \"{}\" ({} of {})", rename.id(), rename.names().from(),
						rename.names().to(), done.size(), renames.size());
			}
			catch (IOException ex) {
				logger.debug("Moving nested label {} \"{}\" -> \"{}\" failed, rolling back {} earlier moves",
						rename.id(), rename.names().from(), rename.names().to(), done.size());
				logger.warn("Renaming nested label {} failed, rolling back {} renames", rename.id(), done.size(), ex);
				List<Rename> notRestored = new ArrayList<>(undo(labels, done));
				notRestored.addAll(undoAlso.get());
				if (notRestored.isEmpty()) {
					logger.debug("Rollback complete, nothing left changed");
				}
				else {
					logger.debug("Rollback incomplete, {} labels left changed: {}", notRestored.size(), notRestored);
				}
				throw new NestedRenameException(rename.names().describe(), GmailErrors.reason(ex), notRestored, ex);
			}
		}
	}

	// Best-effort undo, newest first. Returns whatever couldn't be restored.
	private List<Rename> undo(Gmail.Users.Labels labels, List<ChildRename> done) {
		List<Rename> notRestored = new ArrayList<>();
		for (ChildRename rename : done.reversed()) {
			try {
				labels.patch(CURRENT_USER, rename.id(), new Label().setName(rename.names().from())).execute();
				logger.debug("Moved nested label {} back to \"{}\"", rename.id(), rename.names().from());
			}
			catch (IOException ex) {
				logger.debug("Couldn't move nested label {} back from \"{}\" to \"{}\"", rename.id(),
						rename.names().to(), rename.names().from());
				logger.error("Couldn't restore the name of label {}", rename.id(), ex);
				notRestored.add(rename.names());
			}
		}
		return notRestored;
	}

	private List<Rename> restore(Gmail.Users.Labels labels, Label before, Label updated) {
		try {
			// PUT so visibility/color changes from the same request get reverted too
			labels.update(CURRENT_USER, before.getId(), copyOf(before)).execute();
			logger.debug("Restored label {} to \"{}\"", before.getId(), before.getName());
			return List.of();
		}
		catch (IOException ex) {
			logger.debug("Couldn't restore label {} from \"{}\" to \"{}\"", before.getId(), updated.getName(),
					before.getName());
			logger.error("Couldn't restore label {}", before.getId(), ex);
			return List.of(new Rename(before.getName(), updated.getName()));
		}
	}

	// newParent "" means the top level
	private static String renamed(String name, String oldParent, String newParent) {
		String rest = name.substring(oldParent.length() + 1);
		return newParent.isEmpty() ? rest : newParent + "/" + rest;
	}

	private static String parentName(String name) {
		int slash = name.lastIndexOf('/');
		return (slash < 0) ? "" : name.substring(0, slash);
	}

	private static String stripPeriod(String text) {
		return text.endsWith(".") ? text.substring(0, text.length() - 1) : text;
	}

	private record ChildRename(String id, Rename names) {
	}

}
