package com.samsara.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Amounts in TND, kept as exact decimals with 2 digits (what the database stores). */
public final class Money {

    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private Money() {
    }

    /** Null counts as 0. */
    public static BigDecimal of(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal of(long value) {
        return BigDecimal.valueOf(value).setScale(2);
    }

    public static boolean isPositive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    public static boolean isNegative(BigDecimal value) {
        return value != null && value.signum() < 0;
    }

    public static BigDecimal times(BigDecimal value, long count) {
        return of(value).multiply(BigDecimal.valueOf(count)).setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal percent(BigDecimal value, int percent) {
        return of(value).multiply(BigDecimal.valueOf(percent)).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal min(BigDecimal a, BigDecimal b) {
        return of(a).min(of(b));
    }

    public static BigDecimal max(BigDecimal a, BigDecimal b) {
        return of(a).max(of(b));
    }

    /** Never below zero. */
    public static BigDecimal minus(BigDecimal a, BigDecimal b) {
        return of(a).subtract(of(b)).max(ZERO);
    }

    public static boolean greaterThan(BigDecimal a, BigDecimal b) {
        return of(a).compareTo(of(b)) > 0;
    }

    /** Null stays null: for optional columns such as a refund that was never given. */
    public static BigDecimal positiveOrNull(BigDecimal value) {
        return isPositive(value) ? of(value) : null;
    }
}
