package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "payment_statuses")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "share_id", nullable = false, unique = true)
    private Share share;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentState status;

    private Instant markedAt;
    private Instant confirmedAt;

    @Column(name = "transaction_ref")
    private String transactionRef;

    @Column(name = "proof_url")
    private String proofUrl;

    @Version
    private Long version;
}
