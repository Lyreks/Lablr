package com.lablr.backend.label;

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

}
