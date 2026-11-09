package com.lablr.backend.gmail;

import org.springframework.http.HttpStatus;

// Gmail can't be called until the user signs in with Google again
public class GmailSignInRequiredException extends RuntimeException {

	private final HttpStatus status;

	private final String detail;

	private GmailSignInRequiredException(String reason, HttpStatus status, String detail) {
		super(reason);
		this.status = status;
		this.detail = detail;
	}

	public static GmailSignInRequiredException missingScope() {
		return new GmailSignInRequiredException("Gmail labels scope not granted", HttpStatus.FORBIDDEN,
				"One more step: let Lablr see and edit your Gmail labels.");
	}

	public static GmailSignInRequiredException expired() {
		return new GmailSignInRequiredException("Google access token expired", HttpStatus.UNAUTHORIZED,
				"Your Google sign-in has expired. Sign in again to continue.");
	}

	public HttpStatus status() {
		return status;
	}

	public String detail() {
		return detail;
	}

}
