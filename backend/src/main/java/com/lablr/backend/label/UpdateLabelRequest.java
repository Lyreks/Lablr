package com.lablr.backend.label;

import java.util.ArrayList;
import java.util.List;

import com.google.api.services.gmail.model.Label;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

public record UpdateLabelRequest(
		@Pattern(regexp = ".*\\S.*", message = "must not be blank") String name,
		@Pattern(regexp = "labelShow|labelShowIfUnread|labelHide") String labelListVisibility,
		@Pattern(regexp = "show|hide") String messageListVisibility,
		@Valid LabelColorDto color) {

	Label toGmail() {
		return new Label().setName(name)
			.setLabelListVisibility(labelListVisibility)
			.setMessageListVisibility(messageListVisibility)
			.setColor((color != null) ? color.toGmail() : null);
	}

	// The fields this request sets, for logging
	String changes() {
		List<String> changes = new ArrayList<>();
		if (name != null) {
			changes.add("name=\"%s\"".formatted(name));
		}
		if (labelListVisibility != null) {
			changes.add("labelListVisibility=" + labelListVisibility);
		}
		if (messageListVisibility != null) {
			changes.add("messageListVisibility=" + messageListVisibility);
		}
		if (color != null) {
			changes.add("color=%s on %s".formatted(color.textColor(), color.backgroundColor()));
		}
		return changes.isEmpty() ? "nothing" : String.join(", ", changes);
	}

}
