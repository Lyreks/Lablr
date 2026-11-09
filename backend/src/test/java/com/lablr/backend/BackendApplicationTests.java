package com.lablr.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = { "GOOGLE_CLIENT_ID=test-client-id", "GOOGLE_CLIENT_SECRET=test-client-secret" })
class BackendApplicationTests {

	@Autowired
	private OAuth2AuthorizedClientRepository authorizedClients;

	@Test
	void contextLoads() {
	}

	@Test
	void keepsGoogleTokensInTheSession() {
		assertThat(authorizedClients).isInstanceOf(HttpSessionOAuth2AuthorizedClientRepository.class);
	}

}
