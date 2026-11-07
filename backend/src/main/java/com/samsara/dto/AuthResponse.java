package com.samsara.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * The browser keeps the session in an HttpOnly cookie; the token is also in the body for other clients.
 * After sign-up with email verification, there is no session yet: verificationRequired is true.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuthResponse {
    @JsonProperty("access_token")
    private String accessToken;
    private UserDto user;
    private Boolean verificationRequired;
}
