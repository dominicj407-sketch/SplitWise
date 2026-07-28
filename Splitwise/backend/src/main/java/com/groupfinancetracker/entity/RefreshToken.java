package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Server-side record of an issued refresh token, so it can be revoked (unlike a stateless
 * JWT). Only the SHA-256 hash of the raw token is stored -- a DB read never yields a usable
 * token, mirroring how passwords are stored. Rotated on every use (see RefreshTokenService):
 * the presented token is marked revoked and linked to its replacement via replacedByHash, which
 * also lets a stolen-and-reused old token be detected and used to kill the whole family.
 */
@Entity
@Table(name = "refresh_tokens", indexes = {
        @Index(name = "idx_refresh_token_hash", columnList = "token_hash", unique = true)
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by_hash", length = 64)
    private String replacedByHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
