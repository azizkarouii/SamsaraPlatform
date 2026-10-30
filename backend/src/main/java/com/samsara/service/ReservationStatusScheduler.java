package com.samsara.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Moves reservations along the workflow when their dates are reached (spec §9). */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationStatusScheduler {

    private final ReservationService reservationService;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        run();
    }

    @Scheduled(cron = "0 */10 * * * *")
    public void run() {
        try {
            reservationService.autoUpdateStatuses();
        } catch (RuntimeException e) {
            log.warn("Automatic reservation status update failed", e);
        }
    }
}
