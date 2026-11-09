package com.samsara.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Map;
import java.util.Set;

/** The statuses of a reservation, its workflow, and the date format of the API. */
public final class ReservationStatus {

    public static final String PENDING = "pending";
    public static final String CONFIRMED = "confirmed";
    public static final String IN_PROGRESS = "in-progress";
    public static final String COMPLETED = "completed";
    public static final String CANCELLED = "cancelled";

    /** Workflow: pending → confirmed → in-progress → completed, cancellation possible until completion. */
    static final Map<String, Set<String>> TRANSITIONS = Map.of(
            PENDING, Set.of(CONFIRMED, CANCELLED),
            CONFIRMED, Set.of(IN_PROGRESS, CANCELLED),
            IN_PROGRESS, Set.of(COMPLETED, CANCELLED),
            COMPLETED, Set.of(),
            CANCELLED, Set.of()
    );

    private ReservationStatus() {
    }

    /** Older spellings ("in_progress", "Pending", "reserved", "active") mapped to the current statuses. */
    public static String normalize(String status) {
        if (status == null) return PENDING;
        String normalized = status.trim().toLowerCase();
        if ("in_progress".equals(normalized) || "in progress".equals(normalized) || "in-progress".equals(normalized)) {
            return IN_PROGRESS;
        }
        if ("reserved".equals(normalized)) return CONFIRMED;
        if ("active".equals(normalized)) return IN_PROGRESS;
        return normalized;
    }

    static LocalDate parseDate(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("The " + label + " is required");
        }
        try {
            return LocalDate.parse(value, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Invalid " + label + " (expected yyyy-MM-dd)");
        }
    }
}
