package com.lablr.backend.config;

import java.net.URI;
import java.net.URISyntaxException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;

/**
 * Redirects back to the page a login started from. The frontend passes {@code ?returnTo=/path},
 * which is kept in the session across the Google round trip. Only same-site paths are accepted,
 * to avoid an open redirect.
 */
final class LoginReturnTo {

	static final String PARAMETER = "returnTo";

	static final String DEFAULT_PATH = "/";

	private static final String SESSION_ATTRIBUTE = LoginReturnTo.class.getName() + ".PATH";

	private LoginReturnTo() {
	}

	// Remembers returnTo whenever Spring starts a login, clearing any stale value.
	static OAuth2AuthorizationRequestResolver remembering(OAuth2AuthorizationRequestResolver resolver) {
		return new OAuth2AuthorizationRequestResolver() {

			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
				return remember(request, resolver.resolve(request));
			}

			@Override
			public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String registrationId) {
				return remember(request, resolver.resolve(request, registrationId));
			}

		};
	}

	private static OAuth2AuthorizationRequest remember(HttpServletRequest request,
			OAuth2AuthorizationRequest login) {
		if (login != null) {
			String returnTo = request.getParameter(PARAMETER);
			if (isAllowed(returnTo)) {
				request.getSession().setAttribute(SESSION_ATTRIBUTE, returnTo);
			}
			else if (request.getSession(false) != null) {
				request.getSession().removeAttribute(SESSION_ATTRIBUTE);
			}
		}
		return login;
	}

	// Falls back to DEFAULT_PATH without a remembered page.
	static final class SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

		SuccessHandler() {
			super(DEFAULT_PATH);
		}

		@Override
		protected String determineTargetUrl(HttpServletRequest request, HttpServletResponse response) {
			HttpSession session = request.getSession(false);
			if (session != null && session.getAttribute(SESSION_ATTRIBUTE) instanceof String returnTo) {
				session.removeAttribute(SESSION_ATTRIBUTE);
				return returnTo;
			}
			return super.determineTargetUrl(request, response);
		}

	}

	// Same-site paths only: "/labels" yes, "//evil.example" or "https://…" no.
	static boolean isAllowed(String path) {
		if (path == null || !path.startsWith("/") || path.startsWith("//")) {
			return false;
		}
		try {
			URI uri = new URI(path);
			return uri.getScheme() == null && uri.getRawAuthority() == null;
		}
		catch (URISyntaxException ex) {
			// Includes backslashes, which some browsers would treat as "//".
			return false;
		}
	}

}
