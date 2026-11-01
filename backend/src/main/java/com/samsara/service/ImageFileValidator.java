package com.samsara.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

/** Shared checks for uploaded pictures (house photos, profile photos). */
@Component
public class ImageFileValidator {

    public static final long MAX_BYTES = 5L * 1024 * 1024;

    public record CheckedImage(byte[] bytes, String contentType, String extension) {}

    /** The type is read from the file content (magic bytes), not from its name or the browser's claim. */
    public CheckedImage check(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Empty image file");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Each image must be 5 MB or less");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the image", e);
        }
        if (startsWith(bytes, 0xFF, 0xD8, 0xFF)) {
            return new CheckedImage(bytes, "image/jpeg", "jpg");
        }
        if (startsWith(bytes, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return new CheckedImage(bytes, "image/png", "png");
        }
        if (bytes.length > 12 && startsWith(bytes, 'R', 'I', 'F', 'F')
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return new CheckedImage(bytes, "image/webp", "webp");
        }
        throw new IllegalArgumentException("Only JPEG, PNG and WebP images are accepted");
    }

    private static boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if ((bytes[i] & 0xFF) != signature[i]) return false;
        }
        return true;
    }
}
