package com.lablr.backend.label;

import java.io.IOException;
import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/labels")
public class LabelController {

	private final LabelService labelService;

	public LabelController(LabelService labelService) {
		this.labelService = labelService;
	}

	@GetMapping
	public List<LabelResponse> list(@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client)
			throws IOException {
		return labelService.list(client.getAccessToken());
	}

	@GetMapping("/{id}")
	public LabelResponse get(@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client,
			@PathVariable String id) throws IOException {
		return labelService.get(client.getAccessToken(), id);
	}

	@PostMapping
	public ResponseEntity<LabelResponse> create(@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client,
			@Valid @RequestBody CreateLabelRequest request) throws IOException {
		LabelResponse created = labelService.create(client.getAccessToken(), request);
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
			.path("/{id}")
			.buildAndExpand(created.id())
			.toUri();
		return ResponseEntity.created(location).body(created);
	}

	@PatchMapping("/{id}")
	public LabelResponse update(@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client,
			@PathVariable String id, @Valid @RequestBody UpdateLabelRequest request) throws IOException {
		return labelService.update(client.getAccessToken(), id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client, @PathVariable String id)
			throws IOException {
		labelService.delete(client.getAccessToken(), id);
	}

}
