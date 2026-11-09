package com.lablr.backend.gmail;

import java.io.IOException;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

// Maps Gmail failures to our status codes and messages.
public final class GmailErrors {

	private GmailErrors() {
	}

	// Gmail's 4xx as-is; 502 for Gmail 5xx or network errors.
	public static HttpStatusCode status(IOException ex) {
		if (ex instanceof GoogleJsonResponseException gmail && gmail.getStatusCode() < 500) {
			// HttpStatus.valueOf would throw for non-standard codes.
			return HttpStatusCode.valueOf(gmail.getStatusCode());
		}
		return HttpStatus.BAD_GATEWAY;
	}

	// Message to show the user.
	public static String reason(IOException ex) {
		if (!(ex instanceof GoogleJsonResponseException gmail)) {
			return "Gmail couldn't be reached";
		}
		if (gmail.getStatusCode() >= 500) {
			return "Gmail had a temporary problem";
		}
		return (gmail.getDetails() != null) ? gmail.getDetails().getMessage() : gmail.getStatusMessage();
	}

}
