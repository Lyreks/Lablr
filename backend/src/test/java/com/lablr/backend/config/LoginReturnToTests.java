package com.lablr.backend.config;

import java.io.IOException;

import jakarta.servlet.ServletException;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

import static org.assertj.core.api.Assertions.assertThat;

class LoginReturnToTests {

	private final LoginReturnTo returnTo = new LoginReturnTo();

	private final MockHttpSession session = new MockHttpSession();

	@Nested
	class Allowed {

		@ParameterizedTest
		@ValueSource(strings = { "/", "/labels", "/labels/Label_1?x=1#top" })
		void acceptsPathsOnThisSite(String path) {
			assertThat(returnTo.isAllowed(path)).isTrue();
		}

		@ParameterizedTest
		@NullSource
		@ValueSource(strings = { "", "labels", "//evil.example/labels", "/\\evil.example/labels",
				"http://localhost:5173/labels", "https://evil.example/labels", "javascript:alert(1)",
				"/labels with spaces" })
		void rejectsEverythingElse(String path) {
			assertThat(returnTo.isAllowed(path)).isFalse();
		}

	}

	@Nested
	class LoginRoundTrip {

		@Test
		void returnsToRememberedPage() throws Exception {
			startLogin("/labels/Label_1");

			assertThat(finishLogin()).isEqualTo("/labels/Label_1");
		}

		@Test
		void forgetsPageAfterUsingIt() throws Exception {
			startLogin("/labels/Label_1");
			finishLogin();

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void usesHomePageForDisallowedReturnTo() throws Exception {
			startLogin("https://evil.example/labels");

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void usesHomePageWithoutReturnTo() throws Exception {
			startLogin(null);

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void ignoresReturnToOutsideLogin() throws Exception {
			MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/labels");
			request.setSession(session);
			request.setParameter(LoginReturnTo.PARAMETER, "/labels");
			returnTo.rememberFilter().doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		private void startLogin(String path) throws ServletException, IOException {
			MockHttpServletRequest request = new MockHttpServletRequest("GET", "/oauth2/authorization/google");
			request.setSession(session);
			if (path != null) {
				request.setParameter(LoginReturnTo.PARAMETER, path);
			}
			returnTo.rememberFilter().doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
		}

		private String finishLogin() throws ServletException, IOException {
			MockHttpServletRequest request = new MockHttpServletRequest("GET", "/login/oauth2/code/google");
			request.setSession(session);
			MockHttpServletResponse response = new MockHttpServletResponse();
			returnTo.successHandler().onAuthenticationSuccess(request, response, null);
			return response.getRedirectedUrl();
		}

	}

}
