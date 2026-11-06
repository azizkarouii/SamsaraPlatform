package com.samsara.service;

import com.samsara.entity.Reservation;

/**
 * Who has what from a booking.
 * The advance goes to the owner and is kept on cancellation, unless he chooses to give it back.
 * The samsar gain is taken from what the client pays beyond the advance, so it only comes once the stay has
 * started; if a stay in progress is cancelled, it is limited to what had actually been paid beyond the advance.
 * Each one gives money back from his own part.
 */
final class ReservationEarnings {

    private ReservationEarnings() {
    }

    static double owner(Reservation r) {
        double share = amount(r.getTotalAmount()) - amount(r.getSamsarGain());
        return switch (r.getStatus()) {
            case ReservationService.IN_PROGRESS, ReservationService.COMPLETED -> share - amount(r.getRefundAmount());
            case ReservationService.CONFIRMED -> Math.min(amount(r.getAdvanceAmount()), share);
            case ReservationService.CANCELLED -> Math.max(0.0, ownerBeforeRefundOnCancellation(r) - amount(r.getRefundAmount()));
            default -> 0.0;
        };
    }

    static double samsar(Reservation r) {
        return switch (r.getStatus()) {
            case ReservationService.IN_PROGRESS, ReservationService.COMPLETED -> amount(r.getSamsarGain()) - amount(r.getSamsarRefundAmount());
            case ReservationService.CANCELLED -> Math.max(0.0, samsarBeforeRefundOnCancellation(r) - amount(r.getSamsarRefundAmount()));
            default -> 0.0;
        };
    }

    static double samsarUpcoming(Reservation r) {
        return ReservationService.CONFIRMED.equals(r.getStatus()) ? amount(r.getSamsarGain()) : 0.0;
    }

    static double ownerBeforeRefundOnCancellation(Reservation r) {
        return amount(r.getAdvanceAmount()) + amount(r.getPaidAfterAdvance()) - samsarBeforeRefundOnCancellation(r);
    }

    static double samsarBeforeRefundOnCancellation(Reservation r) {
        return Math.min(amount(r.getSamsarGain()), amount(r.getPaidAfterAdvance()));
    }

    private static double amount(Double value) {
        return value != null ? value : 0.0;
    }
}
