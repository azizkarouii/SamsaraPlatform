package com.samsara.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PropertySamsarInviteDto {
    @NotNull
    private Long propertyId;

    @Email
    @NotBlank
    private String email;

    @NotBlank
    private String phone;

    private Integer priceIncreaseTnd;
}