package com.samsara.dto;

import com.samsara.entity.Reservation;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Everything the dashboard shows, computed by the server from the payments received.
 * earned: money already acquired; upcoming: samsar gain still to come; toCollect: what clients still owe.
 */
public record DashboardSummaryDto(
        BigDecimal earned,
        BigDecimal upcoming,
        BigDecimal toCollect,
        long reservationCount,
        Map<String, Long> counts,
        List<MonthTotal> months,
        List<PropertyTotal> byProperty,
        List<Reservation> arrivals,
        List<RentalEarning> rentals,
        long propertyCount) {

    public record MonthTotal(String key, BigDecimal amount, long count) {}

    public record PropertyTotal(String title, BigDecimal amount) {}

    public record RentalEarning(Long id, String propertyTitle, String clientName, LocalDate startDate, LocalDate endDate,
                                String status, BigDecimal total, BigDecimal paid, BigDecimal earned, BigDecimal upcoming) {}
}
