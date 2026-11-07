package com.samsara.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.samsara.dto.NotificationPageDto;
import com.samsara.entity.Notification;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.User;
import com.samsara.repository.NotificationRepository;
import com.samsara.repository.PropertySamsarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final PropertySamsarRepository propertySamsarRepository;
    private final ObjectMapper objectMapper;

    public List<Notification> findByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public NotificationPageDto findPage(Long userId, boolean unreadOnly, int page, int size) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<Notification> result = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId, request)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, request);
        return new NotificationPageDto(result.getContent(), result.getTotalElements());
    }

    public Notification sendPropertyAssignment(Long samsarId, Property property, User owner) {
        return notificationRepository.save(Notification.builder()
                .userId(samsarId)
                .propertyId(property.getId())
                .type("property_assignment")
                .title("Nouveau partage de maison")
                .message(owner.getName() + " vous a ajouté sur la maison \"" + property.getTitle() + "\"")
                .messageKey("property_assigned")
                .messageParams(json(Map.of("actor", owner.getName(), "property", property.getTitle())))
                .isRead(false)
                .build());
    }

    /** One summary notification when an owner shares several houses at once. */
    public Notification sendPropertiesAssignment(Long samsarId, List<Property> properties, User owner) {
        if (properties.size() == 1) {
            return sendPropertyAssignment(samsarId, properties.get(0), owner);
        }
        String titles = String.join(", ", properties.stream().map(p -> "\"" + p.getTitle() + "\"").toList());
        return notificationRepository.save(Notification.builder()
                .userId(samsarId)
                .propertyId(properties.get(0).getId())
                .type("property_assignment")
                .title("Nouveau partage de maisons")
                .message(owner.getName() + " vous a ajouté sur " + properties.size() + " maisons : " + titles)
                .messageKey("properties_assigned")
                .messageParams(json(Map.of("actor", owner.getName(), "count", String.valueOf(properties.size()), "properties", titles)))
                .isRead(false)
                .build());
    }

    public void notifyReservationCreated(Reservation reservation, Property property, User actor) {
        String message = actor.getName() + " a réservé " + property.getTitle()
                + " du " + reservation.getStartDate() + " au " + reservation.getEndDate()
                + " pour " + reservation.getClientName();
        notifyStakeholders(reservation, property, actor, "Nouvelle réservation", message, "reservation_created", true, "reservation_created");
    }

    public void notifyReservationUpdated(Reservation reservation, Property property, User actor) {
        String message = actor.getName() + " a modifié la réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName();
        notifyStakeholders(reservation, property, actor, "Réservation modifiée", message, "reservation_updated", true, "reservation_updated");
    }

    public void notifyStatusChanged(Reservation reservation, Property property, User actor, String status) {
        String title;
        String verb;
        switch (status) {
            case "confirmed" -> { title = "Réservation confirmée"; verb = "confirmée"; }
            case "in-progress" -> { title = "Séjour commencé"; verb = "passée en cours"; }
            case "completed" -> { title = "Séjour terminé"; verb = "terminée"; }
            case "cancelled" -> { title = "Réservation annulée"; verb = "annulée"; }
            default -> { return; }
        }
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été " + verb
                + (actor != null ? " par " + actor.getName() : "");
        String type = "reservation_" + status.replace('-', '_');
        notifyStakeholders(reservation, property, actor, title, message, type, true, type);
    }

    public void notifyReservationEndedEarly(Reservation reservation, Property property, User actor) {
        String message = "Le séjour de " + reservation.getClientName() + " sur " + property.getTitle()
                + " se termine plus tôt que prévu : le " + reservation.getEndDate()
                + " au lieu du " + reservation.getOriginalEndDate() + ". Les jours restants sont de nouveau disponibles";
        notifyStakeholders(reservation, property, actor, "Fin de séjour anticipée", message, "reservation_ended_early", true, "reservation_ended_early");
    }

    /** A pending request lost its dates to another booking confirmed first. */
    public void notifyReservationOverridden(Reservation reservation, Property property) {
        String message = "La réservation en attente de " + reservation.getClientName() + " sur " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") a été annulée : ces dates ont été confirmées pour une autre réservation";
        notifyStakeholders(reservation, property, null, "Réservation en attente annulée", message, "reservation_cancelled", true, "reservation_overridden");
    }

    public void notifyReservationDeleted(Reservation reservation, Property property, User actor) {
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été supprimée par " + actor.getName();
        // The reservation row no longer exists, so the notification must not reference it
        notifyStakeholders(reservation, property, actor, "Réservation supprimée", message, "reservation_deleted", false, "reservation_deleted");
    }

    /**
     * Notifies the property owner, the samsar who made the reservation and every samsar the
     * property is shared with (they share the same calendar), except the user who acted.
     * The French title and message remain as a readable record; the app shows the translated key.
     */
    private void notifyStakeholders(Reservation reservation, Property property, User actor,
                                    String title, String message, String type, boolean linkReservation, String messageKey) {
        Set<Long> recipients = new LinkedHashSet<>();
        recipients.add(property.getCreatedBy());
        recipients.add(reservation.getSamsarId());
        recipients.addAll(propertySamsarRepository.findSamsarIdsByPropertyId(property.getId()));
        if (actor != null) {
            recipients.remove(actor.getId());
        }
        recipients.remove(null);

        Map<String, String> params = new HashMap<>();
        params.put("property", property.getTitle());
        params.put("client", reservation.getClientName());
        params.put("start", reservation.getStartDate().toString());
        params.put("end", reservation.getEndDate().toString());
        if (actor != null) {
            params.put("actor", actor.getName());
        }
        if (reservation.getOriginalEndDate() != null) {
            params.put("plannedEnd", reservation.getOriginalEndDate().toString());
        }
        String paramsJson = json(params);

        for (Long userId : recipients) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .propertyId(property.getId())
                    .reservationId(linkReservation ? reservation.getId() : null)
                    .type(type)
                    .title(title)
                    .message(message)
                    .messageKey(messageKey)
                    .messageParams(paramsJson)
                    .isRead(false)
                    .build());
        }
    }

    private String json(Map<String, String> params) {
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            // Only strings go in: the stored French text remains if this ever happens
            return null;
        }
    }

    private record LegacyFormat(String type, String key, Pattern pattern, List<String> names) {}

    /** French texts written before notifications were stored as translation keys. */
    private static final List<LegacyFormat> LEGACY_FORMATS = List.of(
            legacy("property_assignment", "property_assigned", "(.+) vous a ajouté sur la maison \"(.+)\"", "actor", "property"),
            legacy("property_assignment", "properties_assigned", "(.+) vous a ajouté sur (\\d+) maisons : (.+)", "actor", "count", "properties"),
            legacy("reservation_created", "reservation_created", "(.+) a réservé (.+) du (\\d{4}-\\d{2}-\\d{2})\\S* au (\\d{4}-\\d{2}-\\d{2})\\S* pour (.+)", "actor", "property", "start", "end", "client"),
            legacy("reservation_updated", "reservation_updated", "(.+) a modifié la réservation de (.+) \\((\\d{4}-\\d{2}-\\d{2}) au (\\d{4}-\\d{2}-\\d{2})\\) pour (.+)", "actor", "property", "start", "end", "client"),
            legacy("reservation_cancelled", "reservation_overridden", "La réservation en attente de (.+) sur (.+) \\((\\d{4}-\\d{2}-\\d{2}) au (\\d{4}-\\d{2}-\\d{2})\\) a été annulée : .*", "client", "property", "start", "end"),
            legacy("reservation_deleted", "reservation_deleted", "La réservation de (.+) \\((\\d{4}-\\d{2}-\\d{2}) au (\\d{4}-\\d{2}-\\d{2})\\) pour (.+) a été supprimée par (.+)", "property", "start", "end", "client", "actor"),
            legacy("reservation_ended_early", "reservation_ended_early", "Le séjour de (.+) sur (.+) se termine plus tôt que prévu : le (\\d{4}-\\d{2}-\\d{2}) au lieu du (\\d{4}-\\d{2}-\\d{2})\\..*", "client", "property", "end", "plannedEnd"));

    /** Status changes: "La réservation de X (d au d) pour Y a été confirmée [par Z]". */
    private static final Pattern LEGACY_STATUS = Pattern.compile(
            "La réservation de (.+) \\((\\d{4}-\\d{2}-\\d{2}) au (\\d{4}-\\d{2}-\\d{2})\\) pour (.+?) a été (?:confirmée|passée en cours|terminée|annulée)(?: par (.+))?");
    private static final Set<String> STATUS_TYPES = Set.of("reservation_confirmed", "reservation_in_progress", "reservation_completed", "reservation_cancelled");

    private static LegacyFormat legacy(String type, String key, String regex, String... names) {
        return new LegacyFormat(type, key, Pattern.compile(regex), List.of(names));
    }

    /**
     * Gives the older notifications a translation key, so they also follow the reader's language.
     * Texts that match no known format keep their French text.
     */
    @Transactional
    public int translateLegacyNotifications() {
        int converted = 0;
        for (Notification notification : notificationRepository.findByMessageKeyIsNull()) {
            Map<String, String> params = new HashMap<>();
            String key = null;
            for (LegacyFormat format : LEGACY_FORMATS) {
                Matcher matcher = format.pattern().matcher(notification.getMessage());
                if (format.type().equals(notification.getType()) && matcher.matches()) {
                    key = format.key();
                    for (int i = 0; i < format.names().size(); i++) {
                        params.put(format.names().get(i), matcher.group(i + 1));
                    }
                    break;
                }
            }
            Matcher status = LEGACY_STATUS.matcher(notification.getMessage());
            if (key == null && STATUS_TYPES.contains(notification.getType()) && status.matches()) {
                key = notification.getType();
                params.put("property", status.group(1));
                params.put("start", status.group(2));
                params.put("end", status.group(3));
                params.put("client", status.group(4));
                if (status.group(5) != null) {
                    params.put("actor", status.group(5));
                }
            }
            if (key != null) {
                notification.setMessageKey(key);
                notification.setMessageParams(json(params));
                notificationRepository.save(notification);
                converted++;
            }
        }
        return converted;
    }

    public Notification markAsRead(Long id, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    public void delete(Long id, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notificationRepository.delete(notification);
    }
}
