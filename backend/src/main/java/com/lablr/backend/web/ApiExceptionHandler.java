package com.lablr.backend.web;

import java.io.IOException;

import com.lablr.backend.gmail.ExpiredGmailTokenException;
import com.lablr.backend.gmail.GmailErrors;
import com.lablr.backend.gmail.MissingGmailScopeException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.event.Level;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.security.oauth2.client.ClientAuthorizationRequiredException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.util.DisconnectedClientHelper;

/**
 * Maps exceptions to RFC 9457 problem details. Boot's ProblemDetailsExceptionHandler runs first and
 * takes Spring MVC's own exceptions (validation etc.), so the catch-all here only sees ours.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

	static final String LOGIN_URL = "/oauth2/authorization/google";

	@ExceptionHandler(IOException.class)
	ProblemDetail handleGmailError(IOException ex, HttpServletRequest request) {
		if (DisconnectedClientHelper.isClientDisconnectedException(ex)) {
			logger.debug("Client went away during {}", describe(request));
			return null;
		}
		HttpStatusCode status = GmailErrors.status(ex);
		if (status.value() == HttpStatus.UNAUTHORIZED.value()) {
			logger.info("Gmail rejected the access token for {}", describe(request));
			return signInAgain(HttpStatus.UNAUTHORIZED, "Your Google sign-in is no longer valid. Sign in again to continue.");
		}
		String reason = GmailErrors.reason(ex);
		if (status.is5xxServerError()) {
			logger.error("Gmail request failed for {}", describe(request), ex);
			return ProblemDetail.forStatusAndDetail(status, reason + ". Try again in a moment.");
		}
		// 404/409 are expected. Other 4xx are probably a bug on our end or quota.
		Level level = (status.value() == 404 || status.value() == 409) ? Level.INFO : Level.WARN;
		logger.atLevel(level).log("Gmail returned {} for {}: {}", status.value(), describe(request), reason);
		return ProblemDetail.forStatusAndDetail(status, reason);
	}

	@ExceptionHandler(MissingGmailScopeException.class)
	ProblemDetail handleMissingScope(HttpServletRequest request) {
		logger.info("Gmail labels scope not granted for {}", describe(request));
		return signInAgain(HttpStatus.FORBIDDEN,
				"Gmail label access was not granted. Sign in again and allow access to your email labels.");
	}

	@ExceptionHandler(ExpiredGmailTokenException.class)
	ProblemDetail handleExpiredToken(HttpServletRequest request) {
		logger.info("Google access token expired for {}", describe(request));
		return signInAgain(HttpStatus.UNAUTHORIZED, "Your Google sign-in has expired. Sign in again to continue.");
	}

	// Spring would redirect to Google here, which fetch can't follow
	@ExceptionHandler(ClientAuthorizationRequiredException.class)
	ProblemDetail handleAuthorizationRequired(HttpServletRequest request) {
		logger.info("No Google authorization on file for {}", describe(request));
		return signInAgain(HttpStatus.UNAUTHORIZED, "Sign in with Google to continue.");
	}

	// Fallback: log the whole thing, don't leak anything in the response
	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
		logger.error("Unexpected error for {}", describe(request), ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
				"Something went wrong on our end. Try again in a moment.");
	}

	private static ProblemDetail signInAgain(HttpStatus status, String detail) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setProperty("loginUrl", LOGIN_URL);
		return problem;
	}

	private static String describe(HttpServletRequest request) {
		return request.getMethod() + " " + request.getRequestURI();
	}

}
