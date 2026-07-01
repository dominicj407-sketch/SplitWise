package com.groupfinancetracker.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.User;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.UserRepository;
import com.groupfinancetracker.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Collections;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    @Value("${app.google.client-id}")
    private String googleClientId;

    // ─── Characters used for master password generation ───────────────────────
    private static final String MASTER_PWD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int MASTER_PWD_LENGTH = 12;

    // ─── Login ────────────────────────────────────────────────────────────────

    public DtoModels.AuthResponse login(DtoModels.LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new NotFoundException("Invalid credentials"));
        if ("GOOGLE_OAUTH".equals(user.getPasswordHash())) {
            throw new IllegalStateException("This account uses Google Sign-In. Please log in with Google.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new NotFoundException("Invalid credentials");
        }
        return buildAuthResponse(user);
    }

    // ─── Signup ───────────────────────────────────────────────────────────────

    @Transactional
    public DtoModels.AuthResponse signup(DtoModels.CreateUserRequest req) {
        if (userRepository.findByEmail(req.email()).isPresent()) {
            throw new IllegalStateException("Email already registered");
        }

        String masterPassword = generateMasterPassword();
        String masterHash     = passwordEncoder.encode(masterPassword);
        String passwordHash   = passwordEncoder.encode(req.password());

        User user = User.builder()
                .name(req.name())
                .email(req.email())
                .passwordHash(passwordHash)
                .masterPasswordHash(masterHash)
                .build();
        user = userRepository.save(user);

        // Send welcome email asynchronously (won't block the response)
        emailService.sendWelcomeWithMasterPassword(user.getName(), user.getEmail(), masterPassword);

        return buildAuthResponse(user);
    }

    // ─── Google OAuth ─────────────────────────────────────────────────────────

    @Transactional
    public DtoModels.AuthResponse googleLogin(DtoModels.GoogleAuthRequest req) {
        GoogleIdToken.Payload payload = verifyGoogleToken(req.credential());

        String googleId = payload.getSubject();
        String email    = payload.getEmail();
        String name     = (String) payload.get("name");

        // Find existing user by googleId or by email
        Optional<User> existing = userRepository.findByGoogleId(googleId);
        if (existing.isEmpty()) {
            existing = userRepository.findByEmail(email);
        }

        User user;
        if (existing.isPresent()) {
            // Link googleId if not already set
            user = existing.get();
            if (user.getGoogleId() == null) {
                user.setGoogleId(googleId);
                user = userRepository.save(user);
            }
        } else {
            // New Google user — generate master password and send welcome email
            String masterPassword = generateMasterPassword();
            user = User.builder()
                    .name(name != null ? name : email)
                    .email(email)
                    .passwordHash("GOOGLE_OAUTH")   // cannot log in with email/password
                    .googleId(googleId)
                    .masterPasswordHash(passwordEncoder.encode(masterPassword))
                    .build();
            user = userRepository.save(user);
            emailService.sendWelcomeWithMasterPassword(user.getName(), user.getEmail(), masterPassword);
        }

        return buildAuthResponse(user);
    }

    // ─── Forgot Password ──────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(DtoModels.ForgotPasswordRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new NotFoundException("No account found with that email address"));

        if (user.getMasterPasswordHash() == null ||
                !passwordEncoder.matches(req.masterPassword(), user.getMasterPasswordHash())) {
            throw new IllegalArgumentException("Invalid master password");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);

        emailService.sendPasswordChangedNotification(user.getName(), user.getEmail());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private DtoModels.AuthResponse buildAuthResponse(User user) {
        String token = jwtService.generateToken(user.getId(), user.getEmail());
        var userDto  = new DtoModels.UserResponse(
                user.getId(), user.getName(), user.getEmail(),
                user.getUpiId(), user.getCreatedAt());
        return new DtoModels.AuthResponse(token, userDto);
    }

    private String generateMasterPassword() {
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder(MASTER_PWD_LENGTH);
        for (int i = 0; i < MASTER_PWD_LENGTH; i++) {
            sb.append(MASTER_PWD_CHARS.charAt(rng.nextInt(MASTER_PWD_CHARS.length())));
        }
        return sb.toString();
    }

    private GoogleIdToken.Payload verifyGoogleToken(String credential) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken == null) {
                throw new IllegalArgumentException("Invalid Google token");
            }
            return idToken.getPayload();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("[GoogleAuth] Token verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Google authentication failed");
        }
    }
}
