package com.samsara.dto;

/**
 * What a booking brings to the user asking: "earned" is money already acquired,
 * "upcoming" is a samsar gain that comes once the stay has started.
 */
public record ReservationEarning(Long reservationId, double earned, double upcoming) {}
