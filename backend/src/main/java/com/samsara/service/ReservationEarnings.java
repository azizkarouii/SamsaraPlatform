package com.samsara.service;

import com.samsara.entity.Reservation;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Who has what from a booking, from the money actually received (its recorded payments).
 * The advance goes to the owner and is kept on cancellation, unless he chooses to give it back.
 * The samsar gain is taken from what the client pays beyond the advance, as it is received.
 * Each one gives money back from his own part.
 */
public final class ReservationEarnings {

    private static final Set<String> EXPECTING_MONEY = Set.of(
            ReservationService.CONFIRMED, ReservationService.IN_PROGRESS, ReservationService.COMPLETED);

    private ReservationEarnings() {
    }

    /** Samsar part of what was received, before he gives anything back. */
    public static BigDecimal samsarReceived(Reservation r, BigDecimal paid) {
        BigDecimal paidAfterAdvance = Money.minus(paid, r.getAdvanceAmount());
        return Money.min(r.getSamsarGain(), paidAfterAdvance);
    }

    /** Owner part of what was received, before he gives anything back. */
    public static BigDecimal ownerReceived(Reservation r, BigDecimal paid) {
        return Money.minus(paid, samsarReceived(r, paid));
    }

    public static BigDecimal owner(Reservation r, BigDecimal paid) {
        return Money.minus(ownerReceived(r, paid), r.getRefundAmount());
    }

    public static BigDecimal samsar(Reservation r, BigDecimal paid) {
        return Money.minus(samsarReceived(r, paid), r.getSamsarRefundAmount());
    }

    /** Samsar gain still to come with the next payments of an ongoing booking. */
    public static BigDecimal samsarUpcoming(Reservation r, BigDecimal paid) {
        return EXPECTING_MONEY.contains(r.getStatus()) ? Money.minus(r.getSamsarGain(), samsarReceived(r, paid)) : Money.ZERO;
    }

    /** What the client still owes on an ongoing booking. */
    public static BigDecimal toCollect(Reservation r, BigDecimal paid) {
        return EXPECTING_MONEY.contains(r.getStatus()) ? Money.minus(r.getTotalAmount(), paid) : Money.ZERO;
    }
}
