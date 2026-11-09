package com.lablr.backend.auth;

import com.lablr.backend.gmail.GmailClientFactory;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.annotation.RegisteredOAuth2AuthorizedClient;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

	@GetMapping("/api/me")
	public MeResponse me(@AuthenticationPrincipal OAuth2User user,
			@RegisteredOAuth2AuthorizedClient OAuth2AuthorizedClient client) {
		return new MeResponse(user.getAttribute("name"), user.getAttribute("email"), user.getAttribute("picture"),
				GmailClientFactory.grantsLabels(client.getAccessToken()));
	}

	// gmailAccess is false when the user left Gmail labels unticked on Google's consent screen
	public record MeResponse(String name, String email, String picture, boolean gmailAccess) {
	}

}
