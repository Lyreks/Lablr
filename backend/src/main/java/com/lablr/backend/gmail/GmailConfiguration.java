package com.lablr.backend.gmail;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GmailConfiguration {

	@Bean
	HttpTransport gmailHttpTransport() {
		return new NetHttpTransport();
	}

}
