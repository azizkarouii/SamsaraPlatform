package com.samsara.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** With a cloud storage, photo addresses stay the same: they just redirect to the public address of the file. */
@RestController
@ConditionalOnProperty(name = "application.storage.type", havingValue = "s3")
public class UploadsRedirectController {

    @Value("${application.storage.s3.public-base-url}")
    private String publicBaseUrl;

    @GetMapping("/uploads/**")
    public ResponseEntity<Void> redirect(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String key = uri.substring(uri.indexOf("/uploads/") + "/uploads/".length());
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, publicBaseUrl.replaceAll("/+$", "") + "/" + key)
                .build();
    }
}
