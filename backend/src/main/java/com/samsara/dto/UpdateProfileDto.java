package com.samsara.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileDto {
    @NotBlank
    @Size(min = 3)
    private String name;

    private String phone;
}
