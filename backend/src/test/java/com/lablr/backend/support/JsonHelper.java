package com.lablr.backend.support;

public final class JsonHelper {

	private JsonHelper() {
	}

	public static String fromSingleQuotes(String singleQuoted) {
		return singleQuoted.replace('\'', '"');
	}

}
