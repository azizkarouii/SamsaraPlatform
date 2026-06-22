package com.samsara.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "creator")
    private List<Property> properties;

    @OneToMany(mappedBy = "samsar")
    private List<Reservation> reservations;

    @OneToMany(mappedBy = "user")
    private List<RevenueHistory> revenueHistories;

    @OneToMany(mappedBy = "user")
    private List<Notification> notifications;

    @OneToMany(mappedBy = "samsar")
    private List<PropertySamsar> propertySamsars;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
