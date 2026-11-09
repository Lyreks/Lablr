package com.lablr.backend.label;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Label;
import com.lablr.backend.gmail.GmailClientFactory;
import com.lablr.backend.gmail.GmailErrors;
import com.lablr.backend.label.NestedRenameException.Rename;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LabelService {

	private static final Logger logger = LoggerFactory.getLogger(LabelService.class);

	private static final String CURRENT_USER = "me";

	private final GmailClientFactory gmailClientFactory;

	public LabelService(GmailClientFactory gmailClientFactory) {
		this.gmailClientFactory = gmailClientFactory;
	}

	public List<LabelResponse> list(OAuth2AccessToken token) throws IOException {
		List<Label> labels = labels(token).list(CURRENT_USER).execute().getLabels();
		return (labels != null) ? labels.stream().map(LabelResponse::from).toList() : List.of();
	}

	public LabelResponse get(OAuth2AccessToken token, String id) throws IOException {
		return LabelResponse.from(labels(token).get(CURRENT_USER, id).execute());
	}

	public LabelResponse create(OAuth2AccessToken token, CreateLabelRequest request) throws IOException {
		return LabelResponse.from(labels(token).create(CURRENT_USER, request.toGmail()).execute());
	}

	/**
	 * Gmail doesn't rename child labels with their parent, so we do: "Work" -> "Archive/Work" also
	 * moves "Work/Invoices" to "Archive/Work/Invoices". There are no transactions, so if a child
	 * rename fails we undo the ones already done.
	 */
	public LabelResponse update(OAuth2AccessToken token, String id, UpdateLabelRequest request) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		if (request.name() == null) {
			return LabelResponse.from(labels.patch(CURRENT_USER, id, request.toGmail()).execute());
		}
		Label before = labels.get(CURRENT_USER, id).execute();
		if (before.getName().equals(request.name())) {
			return LabelResponse.from(labels.patch(CURRENT_USER, id, request.toGmail()).execute());
		}
		List<Label> children = childrenOf(labels, before, request.name());
		Label updated = labels.patch(CURRENT_USER, id, request.toGmail()).execute();
		if (!children.isEmpty()) {
			logger.info("Renaming label {} and {} nested labels", id, children.size());
			renameChildren(labels, before, updated, children);
		}
		return LabelResponse.from(updated);
	}

	/**
	 * Children of {@code parent}. Fails fast if one of their new names is taken, instead of Gmail
	 * rejecting it halfway through.
	 */
	private List<Label> childrenOf(Gmail.Users.Labels labels, Label parent, String newName) throws IOException {
		List<Label> all = labels.list(CURRENT_USER).execute().getLabels();
		if (all == null) {
			return List.of();
		}
		String prefix = parent.getName() + "/";
		List<Label> children = all.stream().filter((label) -> label.getName().startsWith(prefix)).toList();
		Set<String> moving = Stream.concat(Stream.of(parent), children.stream())
			.map(Label::getId)
			.collect(Collectors.toSet());
		Set<String> taken = all.stream()
			.filter((label) -> !moving.contains(label.getId()))
			.map(Label::getName)
			.collect(Collectors.toSet());
		for (Label child : children) {
			String target = renamed(child.getName(), parent.getName(), newName);
			if (taken.contains(target)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT,
						"“%s” would become “%s”, which already exists. Nothing was changed.".formatted(child.getName(),
								target));
			}
		}
		return children;
	}

	private void renameChildren(Gmail.Users.Labels labels, Label before, Label updated, List<Label> children) {
		List<ChildRename> done = new ArrayList<>();
		for (Label child : children) {
			ChildRename rename = new ChildRename(child.getId(),
					new Rename(child.getName(), renamed(child.getName(), before.getName(), updated.getName())));
			try {
				labels.patch(CURRENT_USER, rename.id(), new Label().setName(rename.names().to())).execute();
				done.add(rename);
			}
			catch (IOException ex) {
				logger.warn("Renaming nested label {} failed, rolling back {} renames", rename.id(), done.size() + 1,
						ex);
				List<Rename> notRestored = rollBack(labels, before, updated, done);
				throw new NestedRenameException(rename.names(), GmailErrors.reason(ex), notRestored, ex);
			}
		}
	}

	// Best-effort undo, newest first. Returns whatever couldn't be restored.
	private List<Rename> rollBack(Gmail.Users.Labels labels, Label before, Label updated, List<ChildRename> done) {
		List<Rename> notRestored = new ArrayList<>();
		for (ChildRename rename : done.reversed()) {
			try {
				labels.patch(CURRENT_USER, rename.id(), new Label().setName(rename.names().from())).execute();
			}
			catch (IOException ex) {
				logger.error("Couldn't restore the name of label {}", rename.id(), ex);
				notRestored.add(rename.names());
			}
		}
		try {
			// PUT so visibility/color changes from the same request get reverted too
			labels.update(CURRENT_USER, before.getId(), copyOf(before)).execute();
		}
		catch (IOException ex) {
			logger.error("Couldn't restore label {}", before.getId(), ex);
			notRestored.add(new Rename(before.getName(), updated.getName()));
		}
		return notRestored;
	}

	private static String renamed(String name, String oldParent, String newParent) {
		return newParent + name.substring(oldParent.length());
	}

	private record ChildRename(String id, Rename names) {
	}

	public LabelResponse removeColor(OAuth2AccessToken token, String id) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		Label withoutColor = copyOf(labels.get(CURRENT_USER, id).execute()).setColor(null);
		return LabelResponse.from(labels.update(CURRENT_USER, id, withoutColor).execute());
	}

	// Writable fields only, for a PUT.
	private static Label copyOf(Label label) {
		return new Label().setId(label.getId())
			.setName(label.getName())
			.setLabelListVisibility(label.getLabelListVisibility())
			.setMessageListVisibility(label.getMessageListVisibility())
			.setColor(label.getColor());
	}

	public void delete(OAuth2AccessToken token, String id) throws IOException {
		labels(token).delete(CURRENT_USER, id).execute();
	}

	private Gmail.Users.Labels labels(OAuth2AccessToken token) {
		return gmailClientFactory.forUser(token).users().labels();
	}

}
