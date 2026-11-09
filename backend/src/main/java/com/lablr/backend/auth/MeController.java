package com.lablr.backend.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

	@GetMapping("/api/me")
	public MeResponse me(@AuthenticationPrincipal OAuth2User user) {
		return new MeResponse(user.getAttribute("name"), user.getAttribute("email"), user.getAttribute("picture"));
	}

	public record MeResponse(String name, String email, String picture) {
	}

}
