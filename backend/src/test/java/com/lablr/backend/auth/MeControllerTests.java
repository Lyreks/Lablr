package com.lablr.backend.auth;

import com.lablr.backend.config.SecurityConfiguration;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
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
		void requiresLogin() throws Exception {
			mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
		}

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
