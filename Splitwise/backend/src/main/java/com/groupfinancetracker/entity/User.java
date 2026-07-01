
package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "upi_id")
    private String upiId;

    /** BCrypt hash of the one-time master password emailed on signup. */
    @Column(name = "master_password_hash")
    private String masterPasswordHash;

    /** Google OAuth subject ID — set for users who signed up via Google. */
    @Column(name = "google_id", unique = true)
    private String googleId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToMany(mappedBy = "members")
    @Builder.Default
    private Set<Group> groups = new HashSet<>();

    @Version
    private Long version;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
