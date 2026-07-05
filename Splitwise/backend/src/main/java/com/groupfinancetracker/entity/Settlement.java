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

    @Version
    private Long version;
}
