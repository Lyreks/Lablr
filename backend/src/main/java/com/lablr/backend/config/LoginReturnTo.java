package com.lablr.backend.config;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Redirects back to the page a login started from. The frontend passes {@code ?returnTo=/path},
 * which is kept in the session across the Google round trip. Only same-site paths are accepted,
 * to avoid an open redirect.
 */
final class LoginReturnTo {

	static final String PARAMETER = "returnTo";

	static final String DEFAULT_PATH = "/";

	private static final String SESSION_ATTRIBUTE = LoginReturnTo.class.getName() + ".PATH";

	private static final String LOGIN_PATH_PREFIX = "/oauth2/authorization/";

	/** Remembers {@code returnTo} when a login starts, before the redirect to Google. */
	OncePerRequestFilter rememberFilter() {
		return new OncePerRequestFilter() {

			@Override
			protected boolean shouldNotFilter(HttpServletRequest request) {
				return !request.getRequestURI().startsWith(LOGIN_PATH_PREFIX);
			}

			@Override
			protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
					FilterChain chain) throws ServletException, IOException {
				String returnTo = request.getParameter(PARAMETER);
				if (isAllowed(returnTo)) {
					request.getSession().setAttribute(SESSION_ATTRIBUTE, returnTo);
				}
				chain.doFilter(request, response);
			}

		};
	}

	// Falls back to DEFAULT_PATH without a remembered page.
	AuthenticationSuccessHandler successHandler() {
		return (request, response, authentication) -> {
			String target = DEFAULT_PATH;
			HttpSession session = request.getSession(false);
			if (session != null && session.getAttribute(SESSION_ATTRIBUTE) instanceof String returnTo) {
				session.removeAttribute(SESSION_ATTRIBUTE);
				target = returnTo;
			}
			response.sendRedirect(target);
		};
	}

	// Same-site paths only: "/labels" yes, "//evil.example" or "https://…" no.
	boolean isAllowed(String path) {
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
