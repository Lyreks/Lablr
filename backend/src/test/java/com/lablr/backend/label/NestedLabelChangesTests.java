package com.lablr.backend.label;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import com.google.api.services.gmail.GmailScopes;
import com.lablr.backend.gmail.GmailClientFactory;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.skyscreamer.jsonassert.JSONAssert;

import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.web.server.ResponseStatusException;

import static com.lablr.backend.label.RecordingTransport.LABELS_URL;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

// Through LabelService, which hands renames and deletes over to NestedLabelChanges
class NestedLabelChangesTests {

	private final RecordingTransport gmail = new RecordingTransport();

	private final LabelService labelService = new LabelService(new GmailClientFactory(gmail), new NestedLabelChanges());

	private final OAuth2AccessToken token = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "user-token",
			Instant.now(), Instant.now().plusSeconds(3600), Set.of(GmailScopes.GMAIL_LABELS));

	@Nested
	class Rename {

		@Test
		void movesNestedLabelsAlongWithRenamedLabel() throws Exception {
			// Moving "Work/Clients" to the top level as "Clients".
			gmail.respondWith(200, """
					{ "id": "Clients", "name": "Work/Clients" }
					""");
			gmail.thenRespondWith(200, """
					{
					  "labels": [
					    { "id": "Work", "name": "Work" },
					    { "id": "Clients", "name": "Work/Clients" },
					    { "id": "Acme", "name": "Work/Clients/Acme" },
					    { "id": "Invoices", "name": "Work/Clients/Acme/Invoices" },
					    { "id": "Other", "name": "Work/Clients Old" }
					  ]
					}
					""");
			gmail.thenRespondWith(200, """
					{ "id": "Clients", "name": "Clients" }
					""");
			gmail.thenRespondWith(200, "{}");

			LabelResponse moved = labelService.update(token, "Clients",
					new UpdateLabelRequest("Clients", null, null, null));

			assertThat(moved.name()).isEqualTo("Clients");
			List<RecordingTransport.Request> renames = gmail.requests.subList(3, gmail.requests.size());
			assertThat(renames).extracting((rename) -> rename.request().getUrl())
				.containsExactly(LABELS_URL + "/Acme", LABELS_URL + "/Invoices");
			JSONAssert.assertEquals("""
					{ "name": "Clients/Acme" }
					""", renames.get(0).body(), true);
			JSONAssert.assertEquals("""
					{ "name": "Clients/Acme/Invoices" }
					""", renames.get(1).body(), true);
		}

		@Test
		void changesNothingWhenNestedLabelsNewNameIsTaken() {
			gmail.respondWith(200, """
					{ "id": "Clients", "name": "Work/Clients" }
					""");
			gmail.thenRespondWith(200, """
					{
					  "labels": [
					    { "id": "Clients", "name": "Work/Clients" },
					    { "id": "Acme", "name": "Work/Clients/Acme" },
					    { "id": "OtherAcme", "name": "Clients/Acme" }
					  ]
					}
					""");

			assertThatExceptionOfType(ResponseStatusException.class)
				.isThrownBy(() -> labelService.update(token, "Clients", new UpdateLabelRequest("Clients", null, null, null)))
				.satisfies((ex) -> {
					assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
					assertThat(ex.getReason()).contains("“Clients/Acme”");
				});
			assertThat(gmail.requests).extracting(RecordingTransport.Request::method).containsExactly("GET", "GET");
		}

		@Test
		void rollsBackWhenNestedRenameFails() throws Exception {
			respondToRenameWithFailingChild();
			gmail.thenRespondWith(200, "{}");

			assertThatExceptionOfType(NestedRenameException.class)
				.isThrownBy(() -> labelService.update(token, "Clients",
						new UpdateLabelRequest("Clients", null, null, null)))
				.satisfies((ex) -> {
					assertThat(ex.getMessage()).isEqualTo(
							"Couldn't move “Work/Clients/Acme/Invoices” to “Clients/Acme/Invoices”: Gmail had a temporary problem. All changes were undone.");
					assertThat(ex.notRestored()).isEmpty();
				});

			List<RecordingTransport.Request> undo = gmail.requests.subList(5, gmail.requests.size());
			assertThat(undo).extracting((request) -> request.request().getUrl())
				.containsExactly(LABELS_URL + "/Acme", LABELS_URL + "/Clients");
			JSONAssert.assertEquals("""
					{ "name": "Work/Clients/Acme" }
					""", undo.get(0).body(), true);
			assertThat(undo.get(1).method()).isEqualTo("PUT");
			JSONAssert.assertEquals("""
					{
					  "id": "Clients",
					  "name": "Work/Clients",
					  "labelListVisibility": "labelShow",
					  "messageListVisibility": "show",
					  "color": { "textColor": "#000000", "backgroundColor": "#ffffff" }
					}
					""", undo.get(1).body(), true);
		}

		@Test
		void reportsLabelsThatCouldNotBeRestored() {
			respondToRenameWithFailingChild();
			// Gmail stays down, so neither undo works.

			assertThatExceptionOfType(NestedRenameException.class)
				.isThrownBy(() -> labelService.update(token, "Clients",
						new UpdateLabelRequest("Clients", null, null, null)))
				.satisfies((ex) -> {
					assertThat(ex.notRestored()).containsExactly(
							new NestedRenameException.Rename("Work/Clients/Acme", "Clients/Acme"),
							new NestedRenameException.Rename("Work/Clients", "Clients"));
					assertThat(ex.getMessage()).endsWith(
							"Some changes couldn't be undone. Fix these in Gmail: “Clients/Acme” (was “Work/Clients/Acme”), “Clients” (was “Work/Clients”).");
				});
		}

		// Moving "Work/Clients" to "Clients": the first child moves, the second fails with a 500.
		private void respondToRenameWithFailingChild() {
			gmail.respondWith(200, """
					{
					  "id": "Clients",
					  "name": "Work/Clients",
					  "labelListVisibility": "labelShow",
					  "messageListVisibility": "show",
					  "color": { "textColor": "#000000", "backgroundColor": "#ffffff" }
					}
					""");
			gmail.thenRespondWith(200, """
					{
					  "labels": [
					    { "id": "Clients", "name": "Work/Clients" },
					    { "id": "Acme", "name": "Work/Clients/Acme" },
					    { "id": "Invoices", "name": "Work/Clients/Acme/Invoices" }
					  ]
					}
					""");
			gmail.thenRespondWith(200, """
					{ "id": "Clients", "name": "Clients" }
					""");
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(500, """
					{ "error": { "code": 500, "message": "Backend Error" } }
					""");
		}
	}

	@Nested
	class Delete {

		@Test
		void movesNestedLabelsUpALevel() throws Exception {
			respondWithClientsAndChildren();
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(204, "");

			labelService.delete(token, "Clients", false);

			List<RecordingTransport.Request> changes = gmail.requests.subList(2, gmail.requests.size());
			assertThat(changes).extracting(RecordingTransport.Request::method).containsExactly("POST", "POST", "DELETE");
			assertThat(changes).extracting((change) -> change.request().getUrl())
				.containsExactly(LABELS_URL + "/Acme", LABELS_URL + "/Invoices", LABELS_URL + "/Clients");
			JSONAssert.assertEquals("""
					{ "name": "Work/Acme" }
					""", changes.get(0).body(), true);
			JSONAssert.assertEquals("""
					{ "name": "Work/Acme/Invoices" }
					""", changes.get(1).body(), true);
		}

		@Test
		void movesNestedLabelsToTopLevelWhenDeletingTopLevelLabel() throws Exception {
			gmail.respondWith(200, """
					{ "id": "Work", "name": "Work" }
					""");
			gmail.thenRespondWith(200, """
					{ "labels": [ { "id": "Work", "name": "Work" }, { "id": "Clients", "name": "Work/Clients" } ] }
					""");
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(204, "");

			labelService.delete(token, "Work", false);

			JSONAssert.assertEquals("""
					{ "name": "Clients" }
					""", gmail.requests.get(2).body(), true);
		}

		@Test
		void changesNothingWhenAMovedUpNameIsTaken() {
			gmail.respondWith(200, """
					{ "id": "Clients", "name": "Work/Clients" }
					""");
			gmail.thenRespondWith(200, """
					{
					  "labels": [
					    { "id": "Clients", "name": "Work/Clients" },
					    { "id": "Acme", "name": "Work/Clients/Acme" },
					    { "id": "OtherAcme", "name": "Work/Acme" }
					  ]
					}
					""");

			assertThatExceptionOfType(ResponseStatusException.class)
				.isThrownBy(() -> labelService.delete(token, "Clients", false))
				.satisfies((ex) -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
			assertThat(gmail.requests).extracting(RecordingTransport.Request::method).containsExactly("GET", "GET");
		}

		@Test
		void movesNestedLabelsBackWhenDeleteFails() {
			respondWithClientsAndChildren();
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(200, "{}");
			gmail.thenRespondWith(500, """
					{ "error": { "code": 500, "message": "Backend Error" } }
					""");
			gmail.thenRespondWith(200, "{}");

			assertThatExceptionOfType(NestedRenameException.class)
				.isThrownBy(() -> labelService.delete(token, "Clients", false))
				.withMessage("Couldn't delete “Work/Clients”: Gmail had a temporary problem. All changes were undone.");

			List<RecordingTransport.Request> undo = gmail.requests.subList(5, gmail.requests.size());
			assertThat(undo).extracting((request) -> request.request().getUrl())
				.containsExactly(LABELS_URL + "/Invoices", LABELS_URL + "/Acme");
		}

		@Test
		void deletesNestedLabelsDeepestFirstWhenAsked() throws Exception {
			respondWithClientsAndChildren();
			gmail.thenRespondWith(204, "");

			labelService.delete(token, "Clients", true);

			assertThat(gmail.requests.subList(2, gmail.requests.size()))
				.extracting((request) -> request.method() + " " + request.request().getUrl())
				.containsExactly("DELETE " + LABELS_URL + "/Invoices", "DELETE " + LABELS_URL + "/Acme",
						"DELETE " + LABELS_URL + "/Clients");
		}

		@Test
		void reportsWhatWasDeletedWhenDeletingNestedLabelsFails() {
			respondWithClientsAndChildren();
			gmail.thenRespondWith(204, "");
			gmail.thenRespondWith(500, """
					{ "error": { "code": 500, "message": "Backend Error" } }
					""");

			assertThatExceptionOfType(ResponseStatusException.class)
				.isThrownBy(() -> labelService.delete(token, "Clients", true))
				.satisfies((ex) -> {
					assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
					assertThat(ex.getReason()).isEqualTo(
							"Couldn't delete “Work/Clients/Acme”: Gmail had a temporary problem. Already deleted: “Work/Clients/Acme/Invoices”.");
				});
		}

		// Deleting "Work/Clients", which has "Acme" and "Acme/Invoices" inside it.
		private void respondWithClientsAndChildren() {
			gmail.respondWith(200, """
					{ "id": "Clients", "name": "Work/Clients" }
					""");
			gmail.thenRespondWith(200, """
					{
					  "labels": [
					    { "id": "Work", "name": "Work" },
					    { "id": "Clients", "name": "Work/Clients" },
					    { "id": "Acme", "name": "Work/Clients/Acme" },
					    { "id": "Invoices", "name": "Work/Clients/Acme/Invoices" }
					  ]
					}
					""");
		}
	}

}
