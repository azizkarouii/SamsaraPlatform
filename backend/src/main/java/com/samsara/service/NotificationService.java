package com.samsara.service;

import com.samsara.entity.Notification;
import com.samsara.entity.Property;
import com.samsara.entity.Reservation;
import com.samsara.entity.User;
import com.samsara.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public List<Notification> findByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnread(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public Notification create(Notification notification) {
        return notificationRepository.save(notification);
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

    public void notifyReservationCreated(Reservation reservation, Property property, User actor) {
        String title = "Nouvelle réservation";
        String message = actor.getName() + " a réservé " + property.getTitle()
                + " du " + reservation.getStartDate() + " au " + reservation.getEndDate()
                + " pour " + reservation.getClientName();

        notifyUsers(reservation, property, title, message, "reservation_created");
    }

    public void notifyReservationConfirmed(Reservation reservation, Property property, User actor) {
        String title = "Réservation confirmée";
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été confirmée par " + actor.getName();

        notifyUsers(reservation, property, title, message, "reservation_confirmed");
    }

    public void notifyReservationCancelled(Reservation reservation, Property property, User actor) {
        String title = "Réservation annulée";
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été annulée par " + actor.getName();

        notifyUsers(reservation, property, title, message, "reservation_cancelled");
    }

    public void notifyReservationDeleted(Reservation reservation, Property property, User actor) {
        String title = "Réservation supprimée";
        String message = "La réservation de " + property.getTitle()
                + " (" + reservation.getStartDate() + " au " + reservation.getEndDate()
                + ") pour " + reservation.getClientName() + " a été supprimée par " + actor.getName();

        notifyUsers(reservation, property, title, message, "reservation_deleted");
    }

    private void notifyUsers(Reservation reservation, Property property, String title, String message, String type) {
        Long ownerId = property.getCreatedBy();
        Long samsarId = reservation.getSamsarId();

        if (!ownerId.equals(samsarId)) {
            save(ownerId, reservation, property.getId(), title, message, type);
        }
    }

    private void save(Long userId, Reservation reservation, Long propertyId, String title, String message, String type) {
        notificationRepository.save(Notification.builder()
                .userId(userId)
                .propertyId(propertyId)
                .reservationId(reservation.getId())
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build());
    }

    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }
}
