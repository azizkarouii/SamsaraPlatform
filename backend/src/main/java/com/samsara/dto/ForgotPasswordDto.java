package com.samsara.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordDto {
    @Email
    @NotBlank
    private String email;

    /** Language of the email: fr, en or ar. */
    private String language;
}
