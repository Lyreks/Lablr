package com.lablr.backend.config;

import java.io.IOException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import static org.assertj.core.api.Assertions.assertThat;

class LoginReturnToTests {

	private static final OAuth2AuthorizationRequest GOOGLE_LOGIN = OAuth2AuthorizationRequest.authorizationCode()
		.authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
		.clientId("test-client-id")
		.build();

	// Stub: only the authorization path starts a login.
	private static final OAuth2AuthorizationRequestResolver SPRING_RESOLVER = new OAuth2AuthorizationRequestResolver() {

		@Override
		public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
			return request.getRequestURI().startsWith("/oauth2/authorization/") ? GOOGLE_LOGIN : null;
		}

		@Override
		public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
			return resolve(request);
		}

	};

	private final OAuth2AuthorizationRequestResolver resolver = LoginReturnTo.remembering(SPRING_RESOLVER);

	private final MockHttpSession session = new MockHttpSession();

	@Nested
	class Allowed {

		@ParameterizedTest
		@ValueSource(strings = { "/", "/labels", "/labels/Label_1?x=1#top" })
		void acceptsPathsOnThisSite(String path) {
			assertThat(LoginReturnTo.isAllowed(path)).isTrue();
		}

		@ParameterizedTest
		@NullSource
		@ValueSource(strings = { "", "labels", "//evil.example/labels", "/\\evil.example/labels",
				"http://localhost:5173/labels", "https://evil.example/labels", "javascript:alert(1)",
				"/labels with spaces" })
		void rejectsEverythingElse(String path) {
			assertThat(LoginReturnTo.isAllowed(path)).isFalse();
		}

	}

	@Nested
	class LoginRoundTrip {

		@Test
		void passesSpringsLoginThrough() {
			assertThat(request("/oauth2/authorization/google", "/labels")).isSameAs(GOOGLE_LOGIN);
		}

		@Test
		void returnsToRememberedPage() throws Exception {
			request("/oauth2/authorization/google", "/labels/Label_1");

			assertThat(finishLogin()).isEqualTo("/labels/Label_1");
		}

		@Test
		void forgetsPageAfterUsingIt() throws Exception {
			request("/oauth2/authorization/google", "/labels/Label_1");
			finishLogin();

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void forgetsLeftoverPageWhenANewLoginHasNone() throws Exception {
			request("/oauth2/authorization/google", "/labels/Label_1");
			request("/oauth2/authorization/google", null);

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void usesHomePageForDisallowedReturnTo() throws Exception {
			request("/oauth2/authorization/google", "https://evil.example/labels");

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		@Test
		void ignoresReturnToOutsideLogin() throws Exception {
			request("/api/labels", "/labels");

			assertThat(finishLogin()).isEqualTo(LoginReturnTo.DEFAULT_PATH);
		}

		private OAuth2AuthorizationRequest request(String uri, String returnTo) {
			MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
			request.setSession(session);
			if (returnTo != null) {
				request.setParameter(LoginReturnTo.PARAMETER, returnTo);
			}
			return resolver.resolve(request);
		}

		private String finishLogin() throws ServletException, IOException {
			MockHttpServletRequest request = new MockHttpServletRequest("GET", "/login/oauth2/code/google");
			request.setSession(session);
			MockHttpServletResponse response = new MockHttpServletResponse();
			new LoginReturnTo.SuccessHandler().onAuthenticationSuccess(request, response, null);
			return response.getRedirectedUrl();
		}

	}

}
