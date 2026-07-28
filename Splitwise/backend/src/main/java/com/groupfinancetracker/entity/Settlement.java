package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "settlements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Settlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    /** Nullable: event-scoped settlements (confirm / event-level settle) set this; group-level ones leave it null. */
    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event;

    /** Nullable: itemized settlements emitted by confirming a share point back to that share's sub-event,
     * so they can be cleaned up when the expense is edited or deleted. Pairwise settlements leave it null. */
    @ManyToOne
    @JoinColumn(name = "sub_event_id")
    private SubEvent subEvent;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private Instant createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(length = 500)
    private String note;

    /**
     * Workflow state for pairwise/circular settlements initiated via settle-pairwise
     * (mark-as-paid by the debtor, then confirmed by the creditor) -- mirrors PaymentStatus
     * on shares. Null for legacy rows created before this field existed, and for settlements
     * emitted by confirming an itemized share (those are already-final facts): both are
     * treated as CONFIRMED. Only CONFIRMED (or null) settlements count toward balance math.
     */
    @Enumerated(EnumType.STRING)
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
