package com.lablr.backend.label;

import java.time.Instant;
import java.util.Set;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.services.gmail.GmailScopes;
import com.lablr.backend.gmail.GmailClientFactory;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;

import org.springframework.security.oauth2.core.OAuth2AccessToken;

import static com.lablr.backend.label.RecordingTransport.LABELS_URL;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class LabelServiceTests {

	private static final String LABEL_URL = LABELS_URL + "/TestLabel";

	private final RecordingTransport gmail = new RecordingTransport();

	private final LabelService labelService = new LabelService(new GmailClientFactory(gmail), new NestedLabelChanges());

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

		@Test
		void leavesNameAloneWhenNotRenaming() throws Exception {
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Work" }
					""");

			labelService.update(token, "TestLabel", new UpdateLabelRequest(null, "labelHide", null, null));

			assertThat(gmail.requests).hasSize(1);
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
			gmail.respondWith(200, """
					{ "id": "TestLabel", "name": "Work" }
					""");
			gmail.thenRespondWith(200, """
					{ "labels": [ { "id": "TestLabel", "name": "Work" }, { "id": "Other", "name": "Workshop" } ] }
					""");
			gmail.thenRespondWith(204, "");

			labelService.delete(token, "TestLabel", false);

			assertThat(gmail.requests).hasSize(3);
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

		@Test
		void propagatesRejectedTokenAsGmailError() {
			gmail.respondWith(401, """
					{ "error": { "code": 401, "message": "Request had invalid authentication credentials." } }
					""");

			assertThatExceptionOfType(GoogleJsonResponseException.class).isThrownBy(() -> labelService.list(token))
				.satisfies((ex) -> assertThat(ex.getStatusCode()).isEqualTo(401));
			assertThat(gmail.requests).hasSize(1);
		}
	}

}
