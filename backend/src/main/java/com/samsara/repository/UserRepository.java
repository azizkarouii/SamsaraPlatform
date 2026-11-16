package com.samsara.repository;

import com.samsara.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByRole(com.samsara.entity.UserRole role);
    long countByRoleAndActiveTrue(com.samsara.entity.UserRole role);
    java.util.List<User> findByRoleNotOrderByCreatedAtDesc(com.samsara.entity.UserRole role);
}
