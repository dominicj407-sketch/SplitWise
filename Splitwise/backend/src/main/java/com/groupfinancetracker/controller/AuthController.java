package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.AuthResponse;
import com.groupfinancetracker.dto.DtoModels.LoginRequest;
import com.groupfinancetracker.dto.DtoModels.GoogleAuthRequest;
import com.groupfinancetracker.dto.DtoModels.ForgotPasswordRequest;
import com.groupfinancetracker.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    private static final String REFRESH_COOKIE_NAME = "refreshToken";

    @Value("${app.jwt.refreshTtlSeconds:2592000}")
    private long refreshTtlSeconds;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req, HttpServletResponse response) {
        var result = authService.login(req);
        setRefreshCookie(response, result.refreshToken());
        return result.response();
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody com.groupfinancetracker.dto.DtoModels.CreateUserRequest req,
            HttpServletResponse response) {
        var result = authService.signup(req);
        setRefreshCookie(response, result.refreshToken());
        return result.response();
    }

    /** Google OAuth — frontend sends the Google credential (ID token) */
    @PostMapping("/google")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleAuthRequest req, HttpServletResponse response) {
        var result = authService.googleLogin(req);
        setRefreshCookie(response, result.refreshToken());
        return result.response();
    }

    /** Forgot password — verified via master password sent by email at signup */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok("Password updated successfully");
    }

    /**
     * Exchanges the httpOnly refresh cookie for a new (short-lived) access token, rotating the
     * refresh token in the same call. Called silently by the frontend on a 401.
     */
    @PostMapping("/refresh")
    public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        var result = authService.refreshAccess(readRefreshCookie(request));
        setRefreshCookie(response, result.refreshToken());
        return result.response();
    }

    /**
     * Revokes the refresh token so the session can't be silently renewed again; the access
     * token isn't tracked server-side, so it's simply left to expire (within minutes) client-side.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(readRefreshCookie(request));
        clearRefreshCookie(response);
        return ResponseEntity.noContent().build();
    }

    private void setRefreshCookie(HttpServletResponse response, String rawToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, rawToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(refreshTtlSeconds)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String readRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie c : request.getCookies()) {
            if (REFRESH_COOKIE_NAME.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
