package com.lablr.backend.label;

import java.io.IOException;
import java.util.List;
import java.util.stream.Stream;

import com.google.api.client.googleapis.json.GoogleJsonError;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.HttpHeaders;
import com.google.api.client.http.HttpResponseException;
import com.lablr.backend.config.SecurityConfiguration;
import com.lablr.backend.gmail.MissingGmailScopeException;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.junit.jupiter.params.provider.Arguments.arguments;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LabelController.class,
		properties = { "GOOGLE_CLIENT_ID=test-client-id", "GOOGLE_CLIENT_SECRET=test-client-secret" })
@Import(SecurityConfiguration.class)
class LabelControllerTests {

	private static final String LABELS = "/api/labels";
	private static final String LABEL = LABELS + "/TestLabel";
	private static final LabelResponse WORK = new LabelResponse("TestLabel", "Work", "user", "labelShow", "show", null,
			null, null);
	private static final LabelResponse RENAMED = new LabelResponse("TestLabel", "Renamed", "user", "labelShow", "show",
			null, null, null);

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private LabelService labelService;

	@Nested
	class ListLabels {

		@Test
		void returnsLabels() throws Exception {
			given(labelService.list(any())).willReturn(List.of(WORK));

			mvc.perform(get(LABELS).with(oidcLogin()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value("TestLabel"))
				.andExpect(jsonPath("$[0].name").value("Work"));
		}

	}

	@Nested
	class GetLabel {

		@Test
		void returnsLabel() throws Exception {
			given(labelService.get(any(), eq("TestLabel"))).willReturn(WORK);

			mvc.perform(get(LABEL).with(oidcLogin()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("TestLabel"))
				.andExpect(jsonPath("$.name").value("Work"));
		}

	}

	@Nested
	class CreateLabel {

		@Test
		void returnsCreatedLabelWithLocation() throws Exception {
			CreateLabelRequest expected = new CreateLabelRequest("Work", "labelShow", "show",
					new LabelColorDto("#000000", "#ffffff"));
			given(labelService.create(any(), eq(expected))).willReturn(WORK);

			mvc.perform(post(LABELS).with(oidcLogin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "name": "Work",
						  "labelListVisibility": "labelShow",
						  "messageListVisibility": "show",
						  "color": { "textColor": "#000000", "backgroundColor": "#ffffff" }
						}
						"""))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "http://localhost/api/labels/TestLabel"))
				.andExpect(jsonPath("$.id").value("TestLabel"))
				.andExpect(jsonPath("$.name").value("Work"));
		}

		@ParameterizedTest
		@ValueSource(strings = {
				"{}",
				"""
				{ "name": " " }
				""",
				"""
				{ "name": "Work", "labelListVisibility": "sometimes" }
				""",
				"""
				{ "name": "Work", "messageListVisibility": "maybe" }
				""",
				"""
				{ "name": "Work", "color": { "textColor": "red", "backgroundColor": "#ffffff" } }
				""",
				"""
				{ "name": "Work", "color": { "textColor": "#000000" } }
				""" })
		void rejectsInvalidBody(String body) throws Exception {
			mvc.perform(post(LABELS).with(oidcLogin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
				.andExpect(status().isBadRequest());

			then(labelService).shouldHaveNoInteractions();
		}

	}

	@Nested
	class UpdateLabel {

		@Test
		void returnsUpdatedLabel() throws Exception {
			UpdateLabelRequest expected = new UpdateLabelRequest("Renamed", null, null, null);
			given(labelService.update(any(), eq("TestLabel"), eq(expected))).willReturn(RENAMED);

			mvc.perform(patch(LABEL).with(oidcLogin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{ "name": "Renamed" }
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("TestLabel"))
				.andExpect(jsonPath("$.name").value("Renamed"));
		}

		@ParameterizedTest
		@ValueSource(strings = {
				"""
				{ "name": "" }
				""",
				"""
				{ "name": " " }
				""",
				"""
				{ "labelListVisibility": "sometimes" }
				""",
				"""
				{ "messageListVisibility": "maybe" }
				""",
				"""
				{ "color": { "textColor": "red", "backgroundColor": "#ffffff" } }
				""",
				"""
				{ "color": { "textColor": "#000000" } }
				""" })
		void rejectsInvalidBody(String body) throws Exception {
			mvc.perform(patch(LABEL).with(oidcLogin())
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
				.andExpect(status().isBadRequest());

			then(labelService).shouldHaveNoInteractions();
		}

	}

	@Nested
	class RemoveColor {

		@Test
		void returnsLabelWithoutColor() throws Exception {
			given(labelService.removeColor(any(), eq("TestLabel"))).willReturn(WORK);

			mvc.perform(delete(LABEL + "/color").with(oidcLogin()).with(csrf()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("TestLabel"))
				.andExpect(jsonPath("$.color").doesNotExist());
		}

	}

	@Nested
	class DeleteLabel {

		@Test
		void returnsNoContent() throws Exception {
			mvc.perform(delete(LABEL).with(oidcLogin()).with(csrf()))
				.andExpect(status().isNoContent());

			then(labelService).should().delete(any(), eq("TestLabel"));
		}

	}

	@Nested
	class Security {

		static Stream<Arguments> allEndpoints() {
			return Stream.of(
					arguments(HttpMethod.GET, LABELS),
					arguments(HttpMethod.GET, LABEL),
					arguments(HttpMethod.POST, LABELS),
					arguments(HttpMethod.PATCH, LABEL),
					arguments(HttpMethod.DELETE, LABEL),
					arguments(HttpMethod.DELETE, LABEL + "/color"));
		}

		static Stream<Arguments> changingEndpoints() {
			return allEndpoints().filter(endpoint -> endpoint.get()[0] != HttpMethod.GET);
		}

		@ParameterizedTest
		@MethodSource("allEndpoints")
		void requiresLogin(HttpMethod method, String path) throws Exception {
			mvc.perform(jsonRequest(method, path).with(csrf()))
				.andExpect(status().isUnauthorized());

			then(labelService).shouldHaveNoInteractions();
		}

		@ParameterizedTest
		@MethodSource("changingEndpoints")
		void requiresCsrfToken(HttpMethod method, String path) throws Exception {
			mvc.perform(jsonRequest(method, path).with(oidcLogin()))
				.andExpect(status().isForbidden());

			then(labelService).shouldHaveNoInteractions();
		}

		@Test
		void allowsFrontendOriginWithCredentials() throws Exception {
			mvc.perform(options(LABELS).header("Origin", "http://localhost:3000")
				.header("Access-Control-Request-Method", "POST"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"))
				.andExpect(header().string("Access-Control-Allow-Credentials", "true"));
		}

		@Test
		void rejectsUnknownOrigin() throws Exception {
			mvc.perform(options(LABELS).header("Origin", "https://example.com")
				.header("Access-Control-Request-Method", "POST"))
				.andExpect(status().isForbidden());
		}

	}

	@Nested
	class ErrorHandling {

		@ParameterizedTest
		@ValueSource(ints = { 400, 403, 404, 409, 429 })
		void keepsGmailStatusAndMessage(int gmailStatus) throws Exception {
			given(labelService.get(any(), eq("TestLabel")))
				.willThrow(gmailError(gmailStatus, "Gmail error", "Gmail says no"));

			mvc.perform(get(LABEL).with(oidcLogin()))
				.andExpect(status().is(gmailStatus))
				.andExpect(jsonPath("$.detail").value("Gmail says no"));
		}

		@Test
		void fallsBackToStatusMessageWithoutGmailDetails() throws Exception {
			given(labelService.get(any(), eq("TestLabel"))).willThrow(gmailError(404, "Not Found", null));

			mvc.perform(get(LABEL).with(oidcLogin()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.detail").value("Not Found"));
		}

		@Test
		void asksToSignInAgainWhenLabelsScopeMissing() throws Exception {
			given(labelService.list(any())).willThrow(new MissingGmailScopeException());

			mvc.perform(get(LABELS).with(oidcLogin()))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.loginUrl").value("/oauth2/authorization/google"));
		}

		@Test
		void returnsBadGatewayWhenGmailUnreachable() throws Exception {
			given(labelService.list(any())).willThrow(new IOException("Connection reset"));

			mvc.perform(get(LABELS).with(oidcLogin()))
				.andExpect(status().isBadGateway());
		}

	}

	private static MockHttpServletRequestBuilder jsonRequest(HttpMethod method, String path) {
		return request(method, path).contentType(MediaType.APPLICATION_JSON).content("{}");
	}

	private static GoogleJsonResponseException gmailError(int status, String statusMessage, String detail) {
		HttpResponseException.Builder response = new HttpResponseException.Builder(status, statusMessage,
				new HttpHeaders());
		if (detail == null) {
			return new GoogleJsonResponseException(response, null);
		}
		GoogleJsonError details = new GoogleJsonError();
		details.setMessage(detail);
		return new GoogleJsonResponseException(response, details);
	}

}
