package com.groupfinancetracker.service;

import com.groupfinancetracker.entity.RefreshToken;
import com.groupfinancetracker.entity.User;
import com.groupfinancetracker.exception.UnauthorizedException;
import com.groupfinancetracker.repository.RefreshTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Refresh tokens are opaque, high-entropy random strings (not JWTs) so they can be revoked --
 * a stateless JWT can't be invalidated before its own expiry. Only the SHA-256 hash is ever
 * persisted. Every use rotates the token (old one revoked, new one issued); presenting an
 * already-revoked token is treated as theft/reuse and kills every active token for that user,
 * forcing a fresh login everywhere.
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final PlatformTransactionManager transactionManager;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${app.jwt.refreshTtlSeconds:2592000}")
    private long refreshTtlSeconds;

    public record Rotated(String rawToken, User user) {
    }

    @Transactional
    public String issue(User user) {
        String raw = generateOpaqueToken();
        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(raw))
                .expiresAt(Instant.now().plusSeconds(refreshTtlSeconds))
                .build();
        refreshTokenRepository.save(rt);
        return raw;
    }

    @Transactional
    public Rotated rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank())
            throw new UnauthorizedException("Missing refresh token");

        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (existing.getRevokedAt() != null) {
            // This exact token was already rotated out once before -- someone is replaying an
            // old token (stolen cookie, or a race). Assume compromise, kill every active token.
            //
            // Runs in its own independent (REQUIRES_NEW) transaction, invoked through a plain
            // TransactionTemplate rather than @Transactional -- this method is about to throw a
            // RuntimeException, and Spring rolls back the *entire* ambient transaction when one
            // escapes a @Transactional method. Without this, the revocation below would silently
            // get undone by that rollback, and the "kill the family" response would be cosmetic:
            // the 401 goes out, but every token stays valid in the DB.
            revokeAllForUserInNewTransaction(existing.getUser().getId());
            throw new UnauthorizedException("Refresh token reuse detected; all sessions revoked");
        }
        if (existing.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token expired");
        }

        String newRaw = generateOpaqueToken();
        String newHash = hash(newRaw);
        existing.setRevokedAt(Instant.now());
        existing.setReplacedByHash(newHash);
        refreshTokenRepository.save(existing);

        RefreshToken next = RefreshToken.builder()
                .user(existing.getUser())
                .tokenHash(newHash)
                .expiresAt(Instant.now().plusSeconds(refreshTtlSeconds))
                .build();
        refreshTokenRepository.save(next);

        return new Rotated(newRaw, existing.getUser());
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(rt -> {
                    rt.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(rt);
                });
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        Instant now = Instant.now();
        refreshTokenRepository.findByUser_IdAndRevokedAtIsNull(userId)
                .forEach(rt -> rt.setRevokedAt(now));
    }

    /**
     * Runs revokeAllForUser in a brand-new transaction that commits on its own, independent of
     * whatever the caller's ambient transaction does afterward (see the comment in rotate()).
     * Uses TransactionTemplate rather than @Transactional(propagation = REQUIRES_NEW) because
     * this is called via a plain `this.` self-invocation, which bypasses Spring's AOP proxy
     * entirely -- an annotation here would silently do nothing. TransactionTemplate talks to the
     * PlatformTransactionManager directly, so it works regardless of how it's invoked.
     */
    private void revokeAllForUserInNewTransaction(Long userId) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.executeWithoutResult(status -> revokeAllForUser(userId));
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
