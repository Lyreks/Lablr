package com.lablr.backend.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfiguration {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, @Value("${app.frontend-url}") String frontendUrl)
			throws Exception {
		http
			.authorizeHttpRequests(requests -> requests
				.requestMatchers("/actuator/health", "/error").permitAll()
				.anyRequest().authenticated())
			.oauth2Login(login -> login.defaultSuccessUrl(frontendUrl, true))
			.logout(logout -> logout.logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
			.exceptionHandling(exceptions -> exceptions.defaultAuthenticationEntryPointFor(
					new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
					PathPatternRequestMatcher.withDefaults().matcher("/api/**")))
			.requestCache(cache -> cache.disable())
			.csrf(csrf -> csrf.spa())
			.cors(Customizer.withDefaults());
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
		CorsConfiguration cors = new CorsConfiguration();
		cors.setAllowedOrigins(allowedOrigins);
		cors.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE"));
		cors.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
		cors.setAllowCredentials(true);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", cors);
		return source;
	}

}
