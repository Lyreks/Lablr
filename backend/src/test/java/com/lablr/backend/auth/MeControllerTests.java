package com.lablr.backend.auth;

import java.time.Instant;
import java.util.Set;

import com.google.api.services.gmail.GmailScopes;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Client;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = MeController.class,
		properties = { "GOOGLE_CLIENT_ID=test-client-id", "GOOGLE_CLIENT_SECRET=test-client-secret" })
@Import(SecurityConfiguration.class)
class MeControllerTests {

	@Autowired
	private MockMvc mvc;

	@Nested
	class Me {

		@Test
		void returnsSignedInUser() throws Exception {
			mvc.perform(get("/api/me").with(oidcLogin().idToken(token -> token.claim("name", "Ada Lovelace")
				.claim("email", "ada@example.com")
				.claim("picture", "https://example.com/ada.png"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Ada Lovelace"))
				.andExpect(jsonPath("$.email").value("ada@example.com"))
				.andExpect(jsonPath("$.picture").value("https://example.com/ada.png"));
		}

		@Test
		void reportsGmailAccessWhenLabelsScopeGranted() throws Exception {
			mvc.perform(get("/api/me").with(oidcLogin()).with(oauth2Client("test").accessToken(token(GmailScopes.GMAIL_LABELS))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.gmailAccess").value(true));
		}

		@Test
		void reportsNoGmailAccessWhenLabelsScopeSkipped() throws Exception {
			mvc.perform(get("/api/me").with(oidcLogin()).with(oauth2Client("test").accessToken(token("openid", "email", "profile"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.gmailAccess").value(false));
		}

		@Test
		void requiresLogin() throws Exception {
			mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
		}

	}

	private static OAuth2AccessToken token(String... scopes) {
		return new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "token", Instant.now(),
				Instant.now().plusSeconds(3600), Set.of(scopes));
	}

	@Nested
	class Logout {

		@Test
		void returnsNoContent() throws Exception {
			mvc.perform(post("/logout").with(oidcLogin()).with(csrf())).andExpect(status().isNoContent());
		}

		@Test
		void requiresCsrfToken() throws Exception {
			mvc.perform(post("/logout").with(oidcLogin())).andExpect(status().isForbidden());
		}

	}

}
