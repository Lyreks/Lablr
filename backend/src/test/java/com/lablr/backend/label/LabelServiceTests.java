package com.lablr.backend.label;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.LowLevelHttpRequest;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.Json;
import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.client.testing.http.MockLowLevelHttpRequest;
import com.google.api.client.testing.http.MockLowLevelHttpResponse;
import com.google.api.services.gmail.GmailScopes;
import com.lablr.backend.gmail.GmailClientFactory;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;

import org.springframework.security.oauth2.core.OAuth2AccessToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class LabelServiceTests {

	private static final String BASE_URL = "https://gmail.googleapis.com/gmail/v1/users/me";
	private static final String LABELS_URL = BASE_URL + "/labels";
	private static final String LABEL_URL = LABELS_URL + "/TestLabel";

	private final RecordingTransport gmail = new RecordingTransport();

	private final LabelService labelService = new LabelService(new GmailClientFactory(gmail));

	private final OAuth2AccessToken token = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "user-token",
			Instant.now(), Instant.now().plusSeconds(3600), Set.of(GmailScopes.GMAIL_LABELS));

	@Nested
	class ListLabels {

		@Test
		void mapsGmailLabels() throws Exception {
			gmail.respondWith(200, """
					{
					  "labels": [
					    {
					      "id": "TestLabel",
					      "name": "Work",
					      "type": "user",
					      "labelListVisibility": "labelShow",
					      "messageListVisibility": "show",
					      "color": { "textColor": "#000000", "backgroundColor": "#ffffff" }
					    }
					  ]
					}
					""");

			assertThat(labelService.list(token)).containsExactly(new LabelResponse("TestLabel", "Work", "user",
					"labelShow", "show", new LabelColorDto("#000000", "#ffffff"), null, null));
			assertThat(gmail.method).isEqualTo("GET");
			assertThat(gmail.request.getUrl()).isEqualTo(LABELS_URL);
		}

		@Test
		void returnsEmptyListWhenGmailHasNoLabels() throws Exception {
			gmail.respondWith(200, "{}");

			assertThat(labelService.list(token)).isEmpty();
		}

	}

	@Nested
	class GetLabel {

		@Test
		void mapsMessageCounts() throws Exception {
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Work", "messagesTotal": 12, "messagesUnread": 3 }
					""");

			LabelResponse label = labelService.get(token, "TestLabel");

			assertThat(label.messagesTotal()).isEqualTo(12);
			assertThat(label.messagesUnread()).isEqualTo(3);
			assertThat(gmail.method).isEqualTo("GET");
			assertThat(gmail.request.getUrl()).isEqualTo(LABEL_URL);
		}

	}

	@Nested
	class CreateLabel {

		@Test
		void sendsLabelToGmail() throws Exception {
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Work" }
					""");

			labelService.create(token, new CreateLabelRequest("Work", "labelShow", "show",
					new LabelColorDto("#000000", "#ffffff")));

			assertThat(gmail.method).isEqualTo("POST");
			assertThat(gmail.request.getUrl()).isEqualTo(LABELS_URL);
			JSONAssert.assertEquals("""
					{
					  "name": "Work",
					  "labelListVisibility": "labelShow",
					  "messageListVisibility": "show",
					  "color": { "textColor": "#000000", "backgroundColor": "#ffffff" }
					}
					""", gmail.request.getContentAsString(), true);
		}

		@Test
		void defaultsVisibilityWhenOmitted() throws Exception {
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Work" }
					""");

			labelService.create(token, new CreateLabelRequest("Work", null, null, null));

			JSONAssert.assertEquals("""
					{ "name": "Work", "labelListVisibility": "labelShow", "messageListVisibility": "show" }
					""", gmail.request.getContentAsString(), true);
		}

	}

	@Nested
	class UpdateLabel {

		@Test
		void sendsOnlyProvidedFieldsAsPatch() throws Exception {
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Renamed" }
					""");

			labelService.update(token, "TestLabel", new UpdateLabelRequest("Renamed", null, null, null));

			assertThat(gmail.method).isEqualTo("POST");
			assertThat(gmail.request.getFirstHeaderValue("X-HTTP-Method-Override")).isEqualTo("PATCH");
			assertThat(gmail.request.getUrl()).isEqualTo(LABEL_URL);
			JSONAssert.assertEquals("""
					{ "name": "Renamed" }
					""", gmail.request.getContentAsString(), true);
		}

	}

	@Nested
	class RemoveColor {

		@Test
		void replacesLabelWithoutColor() throws Exception {
			gmail.respondWith(200, """
					{
					  "id": "TestLabel",
					  "name": "Work",
					  "type": "user",
					  "labelListVisibility": "labelShowIfUnread",
					  "messageListVisibility": "hide",
					  "color": { "textColor": "#000000", "backgroundColor": "#ffffff" },
					  "messagesTotal": 12
					}
					""");

			labelService.removeColor(token, "TestLabel");

			assertThat(gmail.method).isEqualTo("PUT");
			assertThat(gmail.request.getUrl()).isEqualTo(LABEL_URL);
			JSONAssert.assertEquals("""
					{
					  "id": "TestLabel",
					  "name": "Work",
					  "labelListVisibility": "labelShowIfUnread",
					  "messageListVisibility": "hide"
					}
					""", gmail.request.getContentAsString(), true);
		}

	}

	@Nested
	class DeleteLabel {

		@Test
		void sendsDeleteToGmail() throws Exception {
			gmail.respondWith(204, "");

			labelService.delete(token, "TestLabel");

			assertThat(gmail.method).isEqualTo("DELETE");
			assertThat(gmail.request.getUrl()).isEqualTo(LABEL_URL);
		}

	}

	@Nested
	class GmailRequests {

		@Test
		void sendsUsersAccessToken() throws Exception {
			gmail.respondWith(200, "{}");

			labelService.list(token);

			assertThat(gmail.request.getFirstHeaderValue("Authorization")).isEqualTo("Bearer user-token");
		}

		@Test
		void propagatesGmailErrors() {
			gmail.respondWith(409, """
					{ "error": { "code": 409, "message": "Label name exists or conflicts" } }
					""");

			assertThatExceptionOfType(GoogleJsonResponseException.class)
				.isThrownBy(() -> labelService.create(token, new CreateLabelRequest("Work", null, null, null)))
				.satisfies(ex -> {
					assertThat(ex.getStatusCode()).isEqualTo(409);
					assertThat(ex.getDetails().getMessage()).isEqualTo("Label name exists or conflicts");
				});
		}

	}

	private static final class RecordingTransport extends MockHttpTransport {

		private final NetHttpTransport production = new NetHttpTransport();

		private final List<Response> responses = new ArrayList<>();

		private final List<Request> requests = new ArrayList<>();

		// Most recent request.
		private String method;

		private MockLowLevelHttpRequest request;

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

}
