package com.lablr.backend.gmail;

import java.time.Instant;
import java.util.Set;

import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.services.gmail.GmailScopes;
import org.junit.jupiter.api.Test;

import org.springframework.security.oauth2.core.OAuth2AccessToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class GmailClientFactoryTests {

	private final GmailClientFactory factory = new GmailClientFactory(new MockHttpTransport());

	@Test
	void rejectsTokenWithoutLabelsScope() {
		assertThatExceptionOfType(MissingGmailScopeException.class)
			.isThrownBy(() -> factory.forUser(token(Set.of("openid", "email"))));
	}

	@Test
	void buildsClientWhenLabelsScopeGranted() {
		assertThat(factory.forUser(token(Set.of("openid", GmailScopes.GMAIL_LABELS)))).isNotNull();
	}

	private static OAuth2AccessToken token(Set<String> scopes) {
		Instant now = Instant.now();
		return new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "token", now, now.plusSeconds(3600), scopes);
	}

}
