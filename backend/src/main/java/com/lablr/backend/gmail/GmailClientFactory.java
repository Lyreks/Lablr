package com.lablr.backend.gmail;

import java.time.Duration;
import java.time.Instant;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.GmailScopes;

import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Component;

@Component
public class GmailClientFactory {

	// Treat tokens this close to expiry as expired so a multi-step update (e.g. a rename that moves
	// children) can't lose access halfway through.
	static final Duration EXPIRY_MARGIN = Duration.ofMinutes(5);

	private final HttpTransport transport;

	public GmailClientFactory(HttpTransport transport) {
		this.transport = transport;
	}

	// Google lets users untick individual permissions when signing in
	public static boolean grantsLabels(OAuth2AccessToken token) {
		return token.getScopes().contains(GmailScopes.GMAIL_LABELS);
	}

	public Gmail forUser(OAuth2AccessToken token) {
		if (!grantsLabels(token)) {
			throw GmailSignInRequiredException.missingScope();
		}
		Instant expiresAt = token.getExpiresAt();
		if (expiresAt != null && expiresAt.isBefore(Instant.now().plus(EXPIRY_MARGIN))) {
			throw GmailSignInRequiredException.expired();
		}
		// Plain bearer header instead of GoogleCredentials, which try to refresh on a 401. With no
		// refresh token that throws IllegalStateException and hides Gmail's actual error.
		String authorization = "Bearer " + token.getTokenValue();
		return new Gmail.Builder(transport, GsonFactory.getDefaultInstance(),
				(request) -> request.getHeaders().setAuthorization(authorization))
			.setApplicationName("Lablr")
			.build();
	}

}
