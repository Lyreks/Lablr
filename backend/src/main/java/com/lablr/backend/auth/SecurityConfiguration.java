package com.lablr.backend.auth;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import com.google.api.services.gmail.GmailScopes;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestRedirectFilter;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

// The frontend shares this origin through a proxy, so there's no CORS config.
@Configuration
public class SecurityConfiguration {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, ClientRegistrationRepository clients)
			throws Exception {
		DefaultOAuth2AuthorizationRequestResolver google = new DefaultOAuth2AuthorizationRequestResolver(clients,
				OAuth2AuthorizationRequestRedirectFilter.DEFAULT_AUTHORIZATION_REQUEST_BASE_URI);
		Set<String> signInScopes = clients.findByRegistrationId("google").getScopes();
		google.setAuthorizationRequestCustomizer((request) -> {
			// Google adds earlier grants, so returning users get Gmail access back at sign-in
			request.additionalParameters((params) -> params.put("include_granted_scopes", "true"));
			// Sign-in only asks for the profile. Gmail labels is asked for on its own through Grant access,
			// which also skips Google's account chooser since we know who it is.
			signedInEmail().ifPresent((email) -> {
				Set<String> withLabels = new HashSet<>(signInScopes);
				withLabels.add(GmailScopes.GMAIL_LABELS);
				request.scopes(withLabels);
				request.additionalParameters((params) -> params.put("login_hint", email));
			});
		});
		http
			// Pages and assets are public; the app asks /api/me and shows its own sign-in screen
			.authorizeHttpRequests(requests -> requests
				.requestMatchers("/api/**").authenticated()
				.anyRequest().permitAll())
			.oauth2Login(login -> login
				.authorizationEndpoint(endpoint -> endpoint.authorizationRequestResolver(LoginReturnTo.remembering(google)))
				.successHandler(new LoginReturnTo.SuccessHandler()))
			.logout(logout -> logout.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
			.exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
					new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
					PathPatternRequestMatcher.withDefaults().matcher("/api/**")))
			.requestCache(cache -> cache.disable())
			.csrf(csrf -> csrf.spa());
		return http.build();
	}

	private static Optional<String> signedInEmail() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return (authentication != null && authentication.getPrincipal() instanceof OAuth2User user)
				? Optional.ofNullable(user.getAttribute("email")) : Optional.empty();
	}

	// Keep Google tokens in the session so they go away on logout.
	@Bean
	OAuth2AuthorizedClientRepository authorizedClientRepository() {
		return new HttpSessionOAuth2AuthorizedClientRepository();
	}

}
