package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events", indexes = {
        @Index(name = "idx_event_week_year", columnList = "week_number,year")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    @ManyToOne(optional = false)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SubEvent> subEvents = new ArrayList<>();

    // Nullable at the DB level: Hibernate's ddl-auto=update cannot add a NOT NULL
    // column to an already-populated table. Non-null is enforced by EventService instead.
    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(name = "week_number")
    private Integer weekNumber;

    @Column(name = "year")
    private Integer year;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    private Long version;

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = Instant.now();
        computeWeekYear();
    }

    @PreUpdate
    public void preUpdate() {
        computeWeekYear();
    }

    private void computeWeekYear() {
        if (this.weekNumber != null && this.year != null)
            return;
        if (this.eventDate != null) {
            WeekFields wf = WeekFields.ISO;
            this.weekNumber = this.eventDate.get(wf.weekOfWeekBasedYear());
            this.year = this.eventDate.get(wf.weekBasedYear());
        } else {
            this.weekNumber = null;
            this.year = null;
        }
    }
}
