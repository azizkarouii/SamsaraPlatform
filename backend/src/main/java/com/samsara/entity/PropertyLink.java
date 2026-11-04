package com.samsara.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/** Link to something outside the app about a property: a video on TikTok, a Facebook post... */
@Entity
@Table(name = "property_links")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "property_id", nullable = false)
    private Long propertyId;

    @Column(nullable = false, length = 1000)
    private String url;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Property property;
}
