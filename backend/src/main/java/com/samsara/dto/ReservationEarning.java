package com.samsara.dto;

import java.math.BigDecimal;

/**
 * What a booking brings to the user asking: "earned" is money already acquired,
 * "upcoming" is a samsar gain still to come with the next payments.
 */
public record ReservationEarning(Long reservationId, BigDecimal earned, BigDecimal upcoming) {}
