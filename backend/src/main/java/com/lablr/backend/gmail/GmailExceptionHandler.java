package com.lablr.backend.gmail;

import java.io.IOException;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GmailExceptionHandler {

	@ExceptionHandler(GoogleJsonResponseException.class)
	ProblemDetail handleGmailError(GoogleJsonResponseException ex) {
		String detail = (ex.getDetails() != null) ? ex.getDetails().getMessage() : ex.getStatusMessage();
		// HttpStatus.valueOf throws for non-standard codes.
		return ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(ex.getStatusCode()), detail);
	}

	@ExceptionHandler(MissingGmailScopeException.class)
	ProblemDetail handleMissingScope(MissingGmailScopeException ex) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
				"Gmail label access was not granted. Sign in again and allow access to your email labels.");
		problem.setProperty("loginUrl", "/oauth2/authorization/google");
		return problem;
	}

	@ExceptionHandler(IOException.class)
	ProblemDetail handleGmailUnavailable(IOException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, "Gmail API request failed");
	}

}
