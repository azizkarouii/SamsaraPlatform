package com.samsara.service;

import com.samsara.entity.Notification;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.User;
import com.samsara.repository.NotificationRepository;
import com.samsara.repository.PropertySamsarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final PropertySamsarRepository propertySamsarRepository;

    public List<Notification> findByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public Notification sendPropertyAssignment(Long samsarId, Property property, User owner) {
        return notificationRepository.save(Notification.builder()
                .userId(samsarId)
                .propertyId(property.getId())
                .type("property_assignment")
                .title("Nouveau partage de maison")
                .message(owner.getName() + " vous a ajouté sur la maison \"" + property.getTitle() + "\"")
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
                .isRead(false)
                .build());
    }

    public void notifyReservationCreated(Reservation reservation, Property property, User actor) {
        String message = actor.getName() + " a réservé " + property.getTitle()
                + " du " + reservation.getStartDate() + " au " + reservation.getEndDate()
                + " pour " + reservation.getClientName();
        notifyStakeholders(reservation, property, actor, "Nouvelle réservation", message, "reservation_created", true);
    }

    public void notifyReservationUpdated(Reservation reservation, Property property, User actor) {
        String message = actor.getName() + " a modifié la réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName();
        notifyStakeholders(reservation, property, actor, "Réservation modifiée", message, "reservation_updated", true);
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
        notifyStakeholders(reservation, property, actor, title, message, "reservation_" + status.replace('-', '_'), true);
    }

    public void notifyReservationEndedEarly(Reservation reservation, Property property, User actor) {
        String message = "Le séjour de " + reservation.getClientName() + " sur " + property.getTitle()
                + " se termine plus tôt que prévu : le " + reservation.getEndDate()
                + " au lieu du " + reservation.getOriginalEndDate() + ". Les jours restants sont de nouveau disponibles";
        notifyStakeholders(reservation, property, actor, "Fin de séjour anticipée", message, "reservation_ended_early", true);
    }

    /** A pending request lost its dates to another booking confirmed first. */
    public void notifyReservationOverridden(Reservation reservation, Property property) {
        String message = "La réservation en attente de " + reservation.getClientName() + " sur " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") a été annulée : ces dates ont été confirmées pour une autre réservation";
        notifyStakeholders(reservation, property, null, "Réservation en attente annulée", message, "reservation_cancelled", true);
    }

    public void notifyReservationDeleted(Reservation reservation, Property property, User actor) {
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été supprimée par " + actor.getName();
        // The reservation row no longer exists, so the notification must not reference it
        notifyStakeholders(reservation, property, actor, "Réservation supprimée", message, "reservation_deleted", false);
    }

    /**
     * Notifies the property owner, the samsar who made the reservation and every samsar the
     * property is shared with (they share the same calendar), except the user who acted.
     */
    private void notifyStakeholders(Reservation reservation, Property property, User actor,
                                    String title, String message, String type, boolean linkReservation) {
        Set<Long> recipients = new LinkedHashSet<>();
        recipients.add(property.getCreatedBy());
        recipients.add(reservation.getSamsarId());
        recipients.addAll(propertySamsarRepository.findSamsarIdsByPropertyId(property.getId()));
        if (actor != null) {
            recipients.remove(actor.getId());
        }
        recipients.remove(null);

        for (Long userId : recipients) {
            notificationRepository.save(Notification.builder()
                    .userId(userId)
                    .propertyId(property.getId())
                    .reservationId(linkReservation ? reservation.getId() : null)
                    .type(type)
                    .title(title)
                    .message(message)
                    .isRead(false)
                    .build());
        }
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
