package com.samsara.service;

import com.samsara.entity.Property;
import com.samsara.entity.PropertySeasonalPrice;
import com.samsara.entity.Reservation;
import com.samsara.repository.PropertySamsarRepository;
import com.samsara.repository.PropertySeasonalPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

/** Price of a stay, what a samsar may charge, and what he earns on it. */
@Component
@RequiredArgsConstructor
public class ReservationPricing {

    private final PropertySamsarRepository propertySamsarRepository;
    private final PropertySeasonalPriceRepository seasonalPriceRepository;
    private final AccessService accessService;

    /** Copies the deal granted by the owner onto the booking. A booking by the owner has no samsar deal. */
    public void freezeSamsarDeal(Reservation reservation, Property property, Long bookerId) {
        if (accessService.isOwner(property, bookerId)) {
            return;
        }
        propertySamsarRepository.findByPropertyIdAndSamsarId(property.getId(), bookerId).ifPresent(deal -> {
            reservation.setSamsarMarginTnd(deal.getPriceIncreaseTnd());
            reservation.setSamsarCommissionPercent(deal.getCommissionPercent());
        });
    }

    /**
     * Price of a stay day by day, last day included: the price of the period covering each day, else the
     * main price (7 days at 100 then 3 days at 200 = 1300). Null when the house has no price at all.
     */
    public BigDecimal computeBaseAmount(Property property, LocalDate start, LocalDate end) {
        if (property.getPricePerDay() == null) {
            return null;
        }
        List<PropertySeasonalPrice> periods = seasonalPriceRepository.findByPropertyIdOrderByStartDateAsc(property.getId());
        BigDecimal amount = Money.ZERO;
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            String monthDay = day.toString().substring(5);
            amount = amount.add(periods.stream()
                    .filter(period -> period.covers(monthDay))
                    .map(PropertySeasonalPrice::getPricePerDay)
                    .findFirst()
                    .orElse(property.getPricePerDay()));
        }
        return Money.of(amount);
    }

    /**
     * Commission: its percentage of the total (300 TND at 10% = 30 for the samsar, 270 for the owner).
     * Fixed margin: what was charged above the house price; on a negotiated price, which already is what the
     * client pays, the margin per day still goes to him and comes out of the owner's part.
     * The owner's own bookings earn no samsar anything.
     */
    public BigDecimal computeSamsarGain(Reservation reservation, Property property) {
        if (accessService.isOwner(property, reservation.getSamsarId())) {
            return Money.ZERO;
        }
        BigDecimal total = Money.of(reservation.getTotalAmount());
        if (reservation.getSamsarCommissionPercent() != null) {
            return Money.percent(total, reservation.getSamsarCommissionPercent());
        }
        if (reservation.getNegotiatedPricePerDay() != null) {
            int margin = reservation.getSamsarMarginTnd() != null ? reservation.getSamsarMarginTnd() : 0;
            return Money.min(total, Money.times(Money.of(margin), days(reservation.getStartDate(), reservation.getEndDate())));
        }
        if (reservation.getBaseAmount() != null) {
            return Money.minus(total, reservation.getBaseAmount());
        }
        return Money.ZERO;
    }

    /**
     * Amounts of a booking. The total follows the spec: number of days (last day included) × daily price;
     * a samsar may add at most the margin granted by the owner (10, 20 or 30 TND per day).
     */
    public void checkAmounts(Reservation reservation, Property property, Long bookerId) {
        BigDecimal total = reservation.getTotalAmount();
        if (total == null || Money.isNegative(total)) {
            throw new IllegalArgumentException("Total amount is required and must be positive");
        }
        if (Money.isNegative(reservation.getAdvanceAmount()) || Money.greaterThan(reservation.getAdvanceAmount(), total)) {
            throw new IllegalArgumentException("Advance must be between 0 and the total amount");
        }

        if (reservation.getBaseAmount() == null) {
            reservation.setBaseAmount(computeBaseAmount(property, reservation.getStartDate(), reservation.getEndDate()));
        }
        long days = days(reservation.getStartDate(), reservation.getEndDate());
        BigDecimal negotiated = reservation.getNegotiatedPricePerDay();
        if (negotiated != null && reservation.getBaseAmount() != null
                && Money.times(negotiated, days).compareTo(reservation.getBaseAmount()) >= 0) {
            throw new IllegalArgumentException("A negotiated price must be below the usual price of the stay");
        }
        if ((negotiated != null || reservation.getBaseAmount() != null) && !accessService.isOwner(property, bookerId)) {
            int margin = reservation.getSamsarMarginTnd() != null ? reservation.getSamsarMarginTnd() : 0;
            BigDecimal max = negotiated != null
                    ? Money.times(negotiated, days)
                    : Money.of(reservation.getBaseAmount()).add(Money.times(Money.of(margin), days));
            if (Money.greaterThan(total, max)) {
                throw new IllegalArgumentException(String.format(Locale.ROOT, "Total exceeds the allowed maximum of %.0f TND", max));
            }
        }
    }

    private static long days(LocalDate start, LocalDate end) {
        return ChronoUnit.DAYS.between(start, end) + 1;
    }
}
