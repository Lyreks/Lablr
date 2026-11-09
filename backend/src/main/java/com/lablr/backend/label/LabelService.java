package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;

import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.Label;
import com.lablr.backend.gmail.GmailClientFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Service;

import static com.lablr.backend.label.GmailLabels.CURRENT_USER;
import static com.lablr.backend.label.GmailLabels.all;
import static com.lablr.backend.label.GmailLabels.copyOf;

@Service
public class LabelService {

	private static final Logger logger = LoggerFactory.getLogger(LabelService.class);

	private final GmailClientFactory gmailClientFactory;

	private final NestedLabelChanges nestedLabelChanges;

	public LabelService(GmailClientFactory gmailClientFactory, NestedLabelChanges nestedLabelChanges) {
		this.gmailClientFactory = gmailClientFactory;
		this.nestedLabelChanges = nestedLabelChanges;
	}

	public List<LabelResponse> list(OAuth2AccessToken token) throws IOException {
		return all(labels(token)).stream().map(LabelResponse::from).toList();
	}

	public LabelResponse get(OAuth2AccessToken token, String id) throws IOException {
		return LabelResponse.from(labels(token).get(CURRENT_USER, id).execute());
	}

	public LabelResponse create(OAuth2AccessToken token, CreateLabelRequest request) throws IOException {
		Label created = labels(token).create(CURRENT_USER, request.toGmail()).execute();
		logger.debug("Created label {} \"{}\"", created.getId(), created.getName());
		return LabelResponse.from(created);
	}

	public LabelResponse update(OAuth2AccessToken token, String id, UpdateLabelRequest request) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		if (request.name() == null) {
			return patch(labels, id, request);
		}
		Label before = labels.get(CURRENT_USER, id).execute();
		if (before.getName().equals(request.name())) {
			return patch(labels, id, request);
		}
		return LabelResponse.from(nestedLabelChanges.rename(labels, before, request));
	}

	private LabelResponse patch(Gmail.Users.Labels labels, String id, UpdateLabelRequest request) throws IOException {
		Label updated = labels.patch(CURRENT_USER, id, request.toGmail()).execute();
		logger.debug("Updated label {} \"{}\": {}", id, updated.getName(), request.changes());
		return LabelResponse.from(updated);
	}

	public void delete(OAuth2AccessToken token, String id, boolean deleteNested) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		nestedLabelChanges.delete(labels, labels.get(CURRENT_USER, id).execute(), deleteNested);
	}

	public LabelResponse removeColor(OAuth2AccessToken token, String id) throws IOException {
		Gmail.Users.Labels labels = labels(token);
		Label withoutColor = copyOf(labels.get(CURRENT_USER, id).execute()).setColor(null);
		Label updated = labels.update(CURRENT_USER, id, withoutColor).execute();
		logger.debug("Removed color from label {} \"{}\"", id, updated.getName());
		return LabelResponse.from(updated);
	}

	private Gmail.Users.Labels labels(OAuth2AccessToken token) {
		return gmailClientFactory.forUser(token).users().labels();
	}

}
