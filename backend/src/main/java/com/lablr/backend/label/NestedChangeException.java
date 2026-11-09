package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A change that renames nested labels (a rename, or a delete that moves the children up) failed
 * partway and was rolled back. {@link #notRestored()} is whatever the rollback couldn't fix.
 */
public class NestedChangeException extends RuntimeException {

	private final List<Rename> notRestored;

	// "Couldn't {failed}: {reason}.", e.g. failed = move “A” to “B”
	NestedChangeException(String failed, String reason, List<Rename> notRestored, IOException cause) {
		super(message(failed, reason, notRestored), cause);
		this.notRestored = List.copyOf(notRestored);
	}

	public List<Rename> notRestored() {
		return notRestored;
	}

	@Override
	public synchronized IOException getCause() {
		return (IOException) super.getCause();
	}

	private static String message(String failed, String reason, List<Rename> notRestored) {
		String start = "Couldn't %s: %s.".formatted(failed, reason);
		if (notRestored.isEmpty()) {
			return start + " All changes were undone.";
		}
		return start + " Some changes couldn't be undone. Fix these in Gmail: " + notRestored.stream()
			.map((rename) -> "“%s” (was “%s”)".formatted(rename.to(), rename.from()))
			.collect(Collectors.joining(", ")) + ".";
	}

	public record Rename(String from, String to) {

		String describe() {
			return "move “%s” to “%s”".formatted(from, to);
		}

	}

}
