package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Label;

final class GmailLabels {

	static final String CURRENT_USER = "me";

	private GmailLabels() {
	}

	static List<Label> all(Gmail.Users.Labels labels) throws IOException {
		List<Label> all = labels.list(CURRENT_USER).execute().getLabels();
		return (all != null) ? all : List.of();
	}

	// Writable fields only, for a PUT.
	static Label copyOf(Label label) {
		return new Label().setId(label.getId())
			.setName(label.getName())
			.setLabelListVisibility(label.getLabelListVisibility())
			.setMessageListVisibility(label.getMessageListVisibility())
			.setColor(label.getColor());
	}

}
