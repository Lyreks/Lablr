package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Moving a renamed label's children failed partway and the rename was rolled back.
 * {@link #notRestored()} is whatever the rollback couldn't fix.
 */
public class NestedRenameException extends RuntimeException {

	private final List<Rename> notRestored;

	NestedRenameException(Rename failed, String reason, List<Rename> notRestored, IOException cause) {
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

	private static String message(Rename failed, String reason, List<Rename> notRestored) {
		String start = "Couldn't move “%s” to “%s”: %s.".formatted(failed.from(), failed.to(), stripPeriod(reason));
		if (notRestored.isEmpty()) {
			return start + " All changes were undone.";
		}
		return start + " Some changes couldn't be undone. Fix these in Gmail: " + notRestored.stream()
			.map((rename) -> "“%s” (was “%s”)".formatted(rename.to(), rename.from()))
			.collect(Collectors.joining(", ")) + ".";
	}

	private static String stripPeriod(String reason) {
		return reason.endsWith(".") ? reason.substring(0, reason.length() - 1) : reason;
	}

	public record Rename(String from, String to) {
	}

}
