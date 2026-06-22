package com.samsara.entity;

import lombok.Data;
import java.io.Serializable;

@Data
public class PropertySamsarId implements Serializable {
    private Long propertyId;
    private Long samsarId;
}
