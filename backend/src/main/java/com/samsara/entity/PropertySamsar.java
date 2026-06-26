package com.samsara.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "property_samsars")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PropertySamsarId.class)
public class PropertySamsar {
    @Id
    @Column(name = "property_id")
    private Long propertyId;

    @Id
    @Column(name = "samsar_id")
    private Long samsarId;

    @Column(name = "price_increase_tnd")
    private Integer priceIncreaseTnd;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", insertable = false, updatable = false)
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "samsar_id", insertable = false, updatable = false)
    @JsonIgnoreProperties({"password", "enabled", "authorities", "accountNonExpired", "accountNonLocked", "credentialsNonExpired", "username"})
    private User samsar;
}
