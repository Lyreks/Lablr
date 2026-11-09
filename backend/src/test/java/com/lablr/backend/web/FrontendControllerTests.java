package com.lablr.backend.web;

import com.lablr.backend.auth.SecurityConfiguration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FrontendController.class,
		properties = { "GOOGLE_CLIENT_ID=test-client-id", "GOOGLE_CLIENT_SECRET=test-client-secret" })
@Import(SecurityConfiguration.class)
class FrontendControllerTests {

	@Autowired
	private MockMvc mvc;

	@ParameterizedTest
	@ValueSource(strings = { "/labels", "/labels/Label_1" })
	void servesTheAppForPageRoutesWithoutSignIn(String path) throws Exception {
		mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
	}

}
