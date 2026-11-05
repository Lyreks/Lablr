package com.lablr.backend.gmail;

import java.util.Date;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.GmailScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;

import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Component;

@Component
public class GmailClientFactory {

	private final HttpTransport transport = new NetHttpTransport();

	public Gmail forUser(OAuth2AccessToken token) {
		if (!token.getScopes().contains(GmailScopes.GMAIL_LABELS)) {
			throw new MissingGmailScopeException();
		}
		GoogleCredentials credentials = GoogleCredentials
			.create(new AccessToken(token.getTokenValue(), Date.from(token.getExpiresAt())));
		return new Gmail.Builder(transport, GsonFactory.getDefaultInstance(), new HttpCredentialsAdapter(credentials))
			.setApplicationName("Lablr")
			.build();
	}

}
