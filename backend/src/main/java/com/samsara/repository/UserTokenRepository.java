package com.samsara.repository;

import com.samsara.entity.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {
    Optional<UserToken> findByTokenHashAndPurpose(String tokenHash, String purpose);

    @Modifying
    @Query("DELETE FROM UserToken t WHERE t.userId = :userId AND t.purpose = :purpose")
    void deleteByUserIdAndPurpose(@Param("userId") Long userId, @Param("purpose") String purpose);
}
