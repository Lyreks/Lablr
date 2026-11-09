package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Label;
import com.lablr.backend.gmail.GmailClientFactory;

import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Service;

@Service
public class LabelService {

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

	public LabelResponse update(OAuth2AccessToken token, String id, UpdateLabelRequest request) throws IOException {
		return LabelResponse.from(labels(token).patch(CURRENT_USER, id, request.toGmail()).execute());
	}

	public LabelResponse removeColor(OAuth2AccessToken token, String id) throws IOException {
		Label current = labels(token).get(CURRENT_USER, id).execute();
		Label withoutColor = new Label().setId(current.getId())
			.setName(current.getName())
			.setLabelListVisibility(current.getLabelListVisibility())
			.setMessageListVisibility(current.getMessageListVisibility());
		return LabelResponse.from(labels(token).update(CURRENT_USER, id, withoutColor).execute());
	}

	public void delete(OAuth2AccessToken token, String id) throws IOException {
		labels(token).delete(CURRENT_USER, id).execute();
	}

	private Gmail.Users.Labels labels(OAuth2AccessToken token) {
		return gmailClientFactory.forUser(token).users().labels();
	}

}
