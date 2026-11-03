package com.samsara.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PropertySamsarInviteDto {
    /** Required for a single-house invite; ignored by the "all properties" invite. */
    private Long propertyId;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String phone;

    private Integer priceIncreaseTnd;

    /** Set instead of priceIncreaseTnd for a percentage deal. */
    private Integer commissionPercent;
}