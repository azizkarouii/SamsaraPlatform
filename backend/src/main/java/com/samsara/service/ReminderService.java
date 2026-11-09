package com.samsara.service;

import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.User;
import com.samsara.repository.NotificationRepository;
import com.samsara.repository.PropertyRepository;
import com.samsara.repository.ReservationRepository;
import com.samsara.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Reminds the owner and the samsar who booked, by notification and email: the day before an arrival
 * (confirmed stays) and on the morning of a departure (stays in progress). Each reminder goes out once,
 * from 8:00, whenever the periodic job runs.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    static final String ARRIVAL = "reminder_arrival";
    static final String DEPARTURE = "reminder_departure";
    private static final LocalTime SEND_FROM = LocalTime.of(8, 0);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Subject and text per language: client, house, date, time, user name, link. */
    private static final Map<String, Map<String, String[]>> EMAILS = Map.of(
            ARRIVAL, Map.of(
                    "fr", new String[]{"Arrivée demain : %1$s à %2$s",
                            "Bonjour %5$s,\n\nRappel : %1$s arrive demain (%3$s) à %2$s, à partir de %4$s.\n\nVoir la réservation : %6$s"},
                    "en", new String[]{"Arriving tomorrow: %1$s at %2$s",
                            "Hello %5$s,\n\nReminder: %1$s arrives tomorrow (%3$s) at %2$s, from %4$s.\n\nSee the reservation: %6$s"},
                    "ar", new String[]{"وصول غدًا: %1$s إلى %2$s",
                            "مرحبًا %5$s،\n\nتذكير: يصل %1$s غدًا (%3$s) إلى %2$s، ابتداءً من %4$s.\n\nعرض الحجز: %6$s"}),
            DEPARTURE, Map.of(
                    "fr", new String[]{"Départ aujourd'hui : %1$s quitte %2$s",
                            "Bonjour %5$s,\n\nRappel : %1$s quitte %2$s aujourd'hui (%3$s) à %4$s.\n\nVoir la réservation : %6$s"},
                    "en", new String[]{"Leaving today: %1$s leaves %2$s",
                            "Hello %5$s,\n\nReminder: %1$s leaves %2$s today (%3$s) at %4$s.\n\nSee the reservation: %6$s"},
                    "ar", new String[]{"مغادرة اليوم: %1$s يغادر %2$s",
                            "مرحبًا %5$s،\n\nتذكير: يغادر %1$s %2$s اليوم (%3$s) على الساعة %4$s.\n\nعرض الحجز: %6$s"}));

    private final ReservationRepository reservationRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final MailService mailService;
    private final Clock clock;

    @Value("${application.frontend-url}")
    private String frontendUrl;

    /** Sends the reminders that are due and not sent yet; returns how many bookings were reminded. */
    @Transactional
    public int sendDueReminders() {
        LocalDateTime now = LocalDateTime.now(clock);
        if (now.toLocalTime().isBefore(SEND_FROM)) {
            return 0;
        }
        LocalDate today = now.toLocalDate();
        int sent = 0;
        for (Reservation reservation : reservationRepository.findByStatusAndStartDate(ReservationStatus.CONFIRMED, today.plusDays(1))) {
            sent += remind(reservation, ARRIVAL, reservation.getStartDate(), reservation.getCheckInTime(), today);
        }
        for (Reservation reservation : reservationRepository.findByStatusAndEndDate(ReservationStatus.IN_PROGRESS, today)) {
            sent += remind(reservation, DEPARTURE, reservation.getEndDate(), reservation.getCheckOutTime(), today);
        }
        return sent;
    }

    private int remind(Reservation reservation, String kind, LocalDate day, String time, LocalDate today) {
        if (notificationRepository.existsByReservationIdAndMessageKeyAndCreatedAtGreaterThanEqual(
                reservation.getId(), kind, today.atStartOfDay())) {
            return 0;
        }
        Property property = propertyRepository.findById(reservation.getPropertyId()).orElse(null);
        if (property == null) {
            return 0;
        }
        String link = frontendUrl + "/reservations/" + reservation.getId();
        for (Long userId : notificationService.notifyReminder(reservation, property, kind)) {
            userRepository.findById(userId).ifPresent(user -> email(user, kind, reservation, property, day, time, link));
        }
        return 1;
    }

    private void email(User user, String kind, Reservation reservation, Property property, LocalDate day, String time, String link) {
        Map<String, String[]> byLanguage = EMAILS.get(kind);
        String[] content = byLanguage.getOrDefault(user.getLanguage(), byLanguage.get("fr"));
        Object[] values = {reservation.getClientName(), property.getTitle(), day.format(DAY), time, user.getName(), link};
        try {
            mailService.send(user.getEmail(), String.format(content[0], values), String.format(content[1], values));
        } catch (RuntimeException e) {
            // The notification is saved: a mail problem must not stop the other reminders
            log.warn("Could not email the {} reminder of reservation {} to user {}", kind, reservation.getId(), user.getId(), e);
        }
    }
}
