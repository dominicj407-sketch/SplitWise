package com.groupfinancetracker.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    @Value("${app.jwt.secret:dev-secret-change-me}")
    private String secret;

    // Short-lived on purpose: this is the bearer token read straight from localStorage on every
    // request, so a leaked one (XSS, logs, etc.) should only be usable for minutes, not a full day.
    // Session longevity now comes from the httpOnly-cookie refresh token (see RefreshTokenService),
    // which the frontend exchanges for a new access token via POST /api/auth/refresh.
    @Value("${app.jwt.ttlSeconds:900}")
    private long ttlSeconds;

    public String generateToken(Long userId, String email) {
        Instant now = Instant.now();
        return JWT.create()
                .withSubject(email)
                .withClaim("uid", userId)
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(ttlSeconds)))
                .sign(Algorithm.HMAC256(secret));
    }

    public DecodedJWT verify(String token) {
        return JWT.require(Algorithm.HMAC256(secret)).build().verify(token);
    }
}
