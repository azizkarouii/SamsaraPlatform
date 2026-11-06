package com.samsara.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Counts attempts per key over a sliding window, in memory. It slows down password guessing on a single server;
 * with several instances this would move to a shared store.
 */
@Component
public class AttemptLimiter {

    private static final Duration WINDOW = Duration.ofMinutes(15);

    private record Attempts(int count, Instant firstAt) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String key, int maxAttempts) {
        Attempts current = attempts.get(key);
        if (current == null) {
            return false;
        }
        if (current.firstAt().plus(WINDOW).isBefore(Instant.now())) {
            attempts.remove(key);
            return false;
        }
        return current.count() >= maxAttempts;
    }

    public void record(String key) {
        attempts.merge(key, new Attempts(1, Instant.now()), (old, added) ->
                old.firstAt().plus(WINDOW).isBefore(Instant.now()) ? added : new Attempts(old.count() + 1, old.firstAt()));
        if (attempts.size() > 10_000) {
            attempts.values().removeIf(entry -> entry.firstAt().plus(WINDOW).isBefore(Instant.now()));
        }
    }

    public void reset(String key) {
        attempts.remove(key);
    }
}
