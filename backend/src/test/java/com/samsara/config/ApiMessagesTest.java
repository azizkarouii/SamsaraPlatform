package com.samsara.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ApiMessagesTest {

    /** The text of "new SomeException(...)": a plain literal, or the start of a concatenated or formatted one. */
    private static final Pattern RAISED = Pattern.compile(
            "new (?:IllegalArgumentException|RuntimeException|AccessDeniedException|ResponseStatusException)\\((?:HttpStatus\\.[A-Z_]+,\\s*)?(?:String\\.format\\()?\"([^\"]+)\"(\\s*\\+|,)?");

    @Test
    void everyMessageRaisedInTheCodeHasATranslation() throws IOException {
        List<String> missing = new ArrayList<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                Matcher matcher = RAISED.matcher(Files.readString(file));
                while (matcher.find()) {
                    String message = matcher.group(1)
                            .replace("%.0f", "100")
                            .replace("%.2f", "100.00");
                    // Concatenated messages are completed with sample values to match their dynamic pattern
                    if (matcher.group(2) != null && matcher.group(2).contains("+")) {
                        message = completeConcatenated(message);
                    }
                    if (!ApiMessages.isKnown(message)) {
                        missing.add(file.getFileName() + ": " + message);
                    }
                }
            }
        }
        assertThat(missing).isEmpty();
    }

    private String completeConcatenated(String start) {
        return switch (start) {
            case "A house can have at most " -> start + "10 links";
            case "Invalid " -> start + "date (expected yyyy-MM-dd)";
            case "The " -> start + "date is required";
            case "Cannot change status from " -> start + "pending to completed";
            default -> start;
        };
    }

    @Test
    void translatesExactAndDynamicMessages() {
        assertThat(ApiMessages.translate("Property not found", "fr")).isEqualTo("Maison introuvable");
        assertThat(ApiMessages.translate("Property not found", "ar-TN")).isEqualTo("المنزل غير موجود");
        assertThat(ApiMessages.translate("Property not found", "en")).isEqualTo("Property not found");
        assertThat(ApiMessages.translate("Property not found", null)).isEqualTo("Property not found");
        assertThat(ApiMessages.translate("Total exceeds the allowed maximum of 800 TND", "fr"))
                .isEqualTo("Le total dépasse le maximum autorisé de 800 TND");
        assertThat(ApiMessages.translate("A message we do not know", "fr")).isEqualTo("A message we do not know");
    }
}
