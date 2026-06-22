package com.samsara.service;

import com.samsara.entity.Notification;
import com.samsara.entity.Property;
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
                .reservationId(null)
                .type("property_assignment")
                .title("Nouveau partage de maison")
                .message(owner.getName() + " vous a ajouté sur la maison \"" + property.getTitle() + "\"")
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
