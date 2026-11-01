package com.samsara.config;

import com.samsara.service.LocalImageStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;

/**
 * Serves the locally stored images under /api/uploads/**. Keys are random and never reused
 * (a replaced photo gets a new key), so the files can be cached for a long time.
 */
@Configuration
@RequiredArgsConstructor
public class UploadsConfig implements WebMvcConfigurer {

    private final LocalImageStorage localImageStorage;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = localImageStorage.getRoot().toUri().toString();
        registry.addResourceHandler("/uploads/**")
                // A resource location must end with "/" to be treated as a directory
                .addResourceLocations(location.endsWith("/") ? location : location + "/")
                .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic());
    }
}
