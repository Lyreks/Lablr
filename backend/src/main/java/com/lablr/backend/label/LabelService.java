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
		Gmail.Users.Labels labels = labels(token);
		String oldName = (request.name() != null) ? labels.get(CURRENT_USER, id).execute().getName() : null;
		Label updated = labels.patch(CURRENT_USER, id, request.toGmail()).execute();
		if (oldName != null && !oldName.equals(updated.getName())) {
			renameNestedLabels(labels, oldName, updated.getName());
		}
		return LabelResponse.from(updated);
	}

	/**
	 * Gmail doesn't rename child labels along with their parent, so do it here:
	 * "Work/Invoices" → "Archive/Work/Invoices".
	 */
	private void renameNestedLabels(Gmail.Users.Labels labels, String oldName, String newName) throws IOException {
		String oldPrefix = oldName + "/";
		List<Label> all = labels.list(CURRENT_USER).execute().getLabels();
		if (all == null) {
			return;
		}
		for (Label label : all) {
			if (label.getName().startsWith(oldPrefix)) {
				String renamed = newName + "/" + label.getName().substring(oldPrefix.length());
				labels.patch(CURRENT_USER, label.getId(), new Label().setName(renamed)).execute();
			}
		}
	}

	public LabelResponse removeColor(OAuth2AccessToken token, String id) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		Label current = labels.get(CURRENT_USER, id).execute();
		Label withoutColor = new Label().setId(current.getId())
			.setName(current.getName())
			.setLabelListVisibility(current.getLabelListVisibility())
			.setMessageListVisibility(current.getMessageListVisibility());
		return LabelResponse.from(labels.update(CURRENT_USER, id, withoutColor).execute());
	}

	public void delete(OAuth2AccessToken token, String id) throws IOException {
		labels(token).delete(CURRENT_USER, id).execute();
	}

	private Gmail.Users.Labels labels(OAuth2AccessToken token) {
		return gmailClientFactory.forUser(token).users().labels();
	}

}
