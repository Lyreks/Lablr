package com.lablr.backend.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

// The built frontend is served from static/. Its page routes get index.html so reloading
// /labels/123 works; "/" is Boot's welcome page.
@Controller
class FrontendController {

	@GetMapping({ "/labels", "/labels/{id}" })
	String index() {
		return "forward:/index.html";
	}

}
