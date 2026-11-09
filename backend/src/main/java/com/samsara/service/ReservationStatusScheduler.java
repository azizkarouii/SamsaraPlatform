package com.samsara.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Moves reservations along the workflow when their dates are reached (spec §9), and sends the reminders. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationStatusScheduler {

    private final ReservationService reservationService;
    private final PropertyService propertyService;
    private final NotificationService notificationService;
    private final ReminderService reminderService;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            int periods = propertyService.normalizeLegacySeasonalPrices();
            if (periods > 0) {
                log.info("Converted {} prices by period to yearly periods", periods);
            }
        } catch (RuntimeException e) {
            log.warn("Legacy price period normalization failed", e);
        }
        try {
            int notifications = notificationService.translateLegacyNotifications();
            if (notifications > 0) {
                log.info("Gave a translation key to {} older notifications", notifications);
            }
        } catch (RuntimeException e) {
            log.warn("Legacy notification translation failed", e);
        }
        try {
            int fixed = reservationService.normalizeLegacyData();
            if (fixed > 0) {
                log.info("Normalized {} legacy reservation rows", fixed);
            }
        } catch (RuntimeException e) {
            log.warn("Legacy reservation normalization failed", e);
        }
        run();
    }

    @Scheduled(cron = "0 */10 * * * *")
    public void run() {
        try {
            reservationService.autoUpdateStatuses();
        } catch (RuntimeException e) {
            log.warn("Automatic reservation status update failed", e);
        }
        try {
            int reminded = reminderService.sendDueReminders();
            if (reminded > 0) {
                log.info("Sent reminders for {} reservations", reminded);
            }
        } catch (RuntimeException e) {
            log.warn("Sending the reminders failed", e);
        }
    }
}
