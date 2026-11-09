package com.lablr.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest(properties = { "GOOGLE_CLIENT_ID=test-client-id", "GOOGLE_CLIENT_SECRET=test-client-secret" })
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private OAuth2AuthorizedClientRepository authorizedClients;

	@Autowired
	private MockMvc mvc;

	@Test
	void contextLoads() {
	}

	@Test
	void keepsGoogleTokensInTheSession() {
		assertThat(authorizedClients).isInstanceOf(HttpSessionOAuth2AuthorizedClientRepository.class);
	}

	@Test
	void buildsTheOAuthRedirectFromForwardedHeaders() throws Exception {
		String location = mvc
			.perform(get("/oauth2/authorization/google").header("X-Forwarded-Proto", "https")
				.header("X-Forwarded-Host", "lablr.example")
				.header("X-Forwarded-Port", "443"))
			.andReturn()
			.getResponse()
			.getRedirectedUrl();

		assertThat(location).contains("redirect_uri=https://lablr.example/login/oauth2/code/google");
	}

}
