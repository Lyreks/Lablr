package com.lablr.backend.label;

import com.google.api.services.gmail.model.LabelColor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LabelColorDto(
		@NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String textColor,
		@NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String backgroundColor) {

	static LabelColorDto from(LabelColor color) {
		return (color != null) ? new LabelColorDto(color.getTextColor(), color.getBackgroundColor()) : null;
	}

	LabelColor toGmail() {
		return new LabelColor().setTextColor(textColor).setBackgroundColor(backgroundColor);
	}

}
