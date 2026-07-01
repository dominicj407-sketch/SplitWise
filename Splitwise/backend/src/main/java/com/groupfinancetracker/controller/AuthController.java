package com.groupfinancetracker.controller;

import com.groupfinancetracker.dto.DtoModels.AuthResponse;
import com.groupfinancetracker.dto.DtoModels.LoginRequest;
import com.groupfinancetracker.dto.DtoModels.GoogleAuthRequest;
import com.groupfinancetracker.dto.DtoModels.ForgotPasswordRequest;
import com.groupfinancetracker.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody com.groupfinancetracker.dto.DtoModels.CreateUserRequest req) {
        return authService.signup(req);
    }

    /** Google OAuth — frontend sends the Google credential (ID token) */
    @PostMapping("/google")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleAuthRequest req) {
        return authService.googleLogin(req);
    }

    /** Forgot password — verified via master password sent by email at signup */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok("Password updated successfully");
    }
}
