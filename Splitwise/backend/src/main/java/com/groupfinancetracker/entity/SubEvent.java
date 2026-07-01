package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sub_events", indexes = {
        @Index(name = "idx_subevent_week_year", columnList = "week_number,year")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SubEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @ManyToOne(optional = false)
    @JoinColumn(name = "payer_id", nullable = false)
    private User payer;

    @ManyToOne(optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @OneToMany(mappedBy = "subEvent", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Share> shares = new ArrayList<>();

    @Column(nullable = false)
    private Instant timestamp;

    @Column(name = "sub_event_date", nullable = false)
    private LocalDate subEventDate;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "year")
    private Integer year;

    @Column(name = "is_recurring")
    @Builder.Default
    private boolean isRecurring = false;

    @Column(name = "recurring_period")
    private String recurringPeriod;

    @Column(name = "next_run_date")
    private Instant nextRunDate;

    @Version
    private Long version;

    @PrePersist
    public void prePersist() {
        if (timestamp == null) timestamp = Instant.now();
    }
}
