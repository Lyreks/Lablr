package com.lablr.backend.label;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import com.google.api.client.http.LowLevelHttpRequest;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.Json;
import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.client.testing.http.MockLowLevelHttpRequest;
import com.google.api.client.testing.http.MockLowLevelHttpResponse;

// Fake Gmail: answers with queued responses and records each request
final class RecordingTransport extends MockHttpTransport {

static final String LABELS_URL = "https://gmail.googleapis.com/gmail/v1/users/me/labels";

	private final NetHttpTransport production = new NetHttpTransport();

	private final List<Response> responses = new ArrayList<>();

	final List<Request> requests = new ArrayList<>();

	// Most recent request.
	String method;

	MockLowLevelHttpRequest request;

	private record Response(int status, String body) {
	}

	record Request(String method, MockLowLevelHttpRequest request) {

		String body() throws IOException {
			return request.getContentAsString();
		}

	}

	// Replaces any queued responses.
	void respondWith(int status, String body) {
		responses.clear();
		responses.add(new Response(status, body));
	}

	// Queued in order; the last one repeats.
	void thenRespondWith(int status, String body) {
		responses.add(new Response(status, body));
	}

	@Override
	public boolean supportsMethod(String method) {
		return production.supportsMethod(method);
	}

	@Override
	public LowLevelHttpRequest buildRequest(String method, String url) {
		Response response = responses.get(Math.min(requests.size(), responses.size() - 1));
		// Response bodies can only be read once.
		this.method = method;
		this.request = new MockLowLevelHttpRequest(url).setResponse(new MockLowLevelHttpResponse()
			.setStatusCode(response.status())
			.setContentType(Json.MEDIA_TYPE)
			.setContent(response.body()));
		requests.add(new Request(method, request));
		return request;
	}

}
