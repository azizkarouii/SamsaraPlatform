package com.samsara.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** One account in the superadmin's list, with what it holds on the platform. */
@Data
@Builder
@AllArgsConstructor
public class AdminUserDto {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String role;
    private Boolean active;
    private Boolean samsarsEnabled;
    private String photoUrl;
    private LocalDateTime createdAt;
    /** Houses of an owner. */
    private long houses;
    /** Houses shared with a samsar, or samsar accesses given by an owner. */
    private long shares;
}
