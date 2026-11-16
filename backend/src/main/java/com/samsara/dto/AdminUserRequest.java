package com.samsara.dto;

import com.samsara.entity.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** An account created or edited by the superadmin. On an edit, a blank password keeps the current one. */
@Data
public class AdminUserRequest {
    @NotBlank
    @Size(min = 3)
    private String name;

    @Email
    @NotBlank
    private String email;

    private String phone;

    /** PROPRIETAIRE or SAMSAR; set at creation only. */
    private UserRole role;

    private String password;

    private Boolean active;

    /** For an owner: works with samsars. */
    private Boolean samsarsEnabled;

    /** fr, en or ar: the language of the emails sent to the account. */
    private String language;
}
