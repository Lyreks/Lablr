package com.lablr.backend.label;

import com.google.api.services.gmail.model.Label;

public record LabelResponse(String id, String name, String type, String labelListVisibility,
		String messageListVisibility, LabelColorDto color, Integer messagesTotal, Integer messagesUnread) {

	static LabelResponse from(Label label) {
		return new LabelResponse(label.getId(), label.getName(), label.getType(), label.getLabelListVisibility(),
				label.getMessageListVisibility(), LabelColorDto.from(label.getColor()), label.getMessagesTotal(),
				label.getMessagesUnread());
	}

}
