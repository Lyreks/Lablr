package com.lablr.backend.label;

import java.util.Objects;

import com.google.api.services.gmail.model.Label;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateLabelRequest(
		@NotBlank String name,
		@Pattern(regexp = "labelShow|labelShowIfUnread|labelHide") String labelListVisibility,
		@Pattern(regexp = "show|hide") String messageListVisibility,
		@Valid LabelColorDto color) {

	Label toGmail() {
		return new Label().setName(name)
			.setLabelListVisibility(Objects.requireNonNullElse(labelListVisibility, "labelShow"))
			.setMessageListVisibility(Objects.requireNonNullElse(messageListVisibility, "show"))
			.setColor((color != null) ? color.toGmail() : null);
	}

}
