package com.lablr.backend.gmail;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.services.gmail.GmailScopes;
import org.junit.jupiter.api.Test;

import org.springframework.security.oauth2.core.OAuth2AccessToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class GmailClientFactoryTests {

	private static final Set<String> LABELS_SCOPE = Set.of("openid", GmailScopes.GMAIL_LABELS);

	private final GmailClientFactory factory = new GmailClientFactory(new MockHttpTransport());

	@Test
	void rejectsTokenWithoutLabelsScope() {
		assertThatExceptionOfType(MissingGmailScopeException.class)
			.isThrownBy(() -> factory.forUser(token(Set.of("openid", "email"), Duration.ofHours(1))));
	}

	@Test
	void buildsClientWhenLabelsScopeGranted() {
		assertThat(factory.forUser(token(LABELS_SCOPE, Duration.ofHours(1)))).isNotNull();
	}

	@Test
	void rejectsExpiredToken() {
		assertThatExceptionOfType(ExpiredGmailTokenException.class)
			.isThrownBy(() -> factory.forUser(token(LABELS_SCOPE, Duration.ofMinutes(-1))));
	}

	@Test
	void rejectsTokenAboutToExpire() {
		assertThatExceptionOfType(ExpiredGmailTokenException.class)
			.isThrownBy(() -> factory.forUser(token(LABELS_SCOPE, GmailClientFactory.EXPIRY_MARGIN.minusSeconds(10))));
	}

	@Test
	void acceptsTokenWithoutExpiry() {
		OAuth2AccessToken token = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "token", null, null,
				LABELS_SCOPE);

		assertThat(factory.forUser(token)).isNotNull();
	}

	private static OAuth2AccessToken token(Set<String> scopes, Duration lifeLeft) {
		Instant now = Instant.now();
		return new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "token", now.minus(Duration.ofHours(1)),
				now.plus(lifeLeft), scopes);
	}

}
