package com.groupfinancetracker.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time migration: populate the new {@code event_date} column for events created before
 * the start_date/end_date range was replaced with a single "happened on" date, using the old
 * (now orphaned) {@code start_date} column, falling back to the event's creation date.
 *
 * <p>Gated by the same {@code schema_migrations} sentinel table used by
 * {@link ConfirmedShareBackfill} so it runs exactly once rather than on every restart.
 */
@Component
@RequiredArgsConstructor
public class EventDateBackfill {
    private static final String MIGRATION_NAME = "event_date_backfill";

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void backfill() {
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, ran_at TIMESTAMPTZ)");
            Integer already = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM schema_migrations WHERE name = ?", Integer.class, MIGRATION_NAME);
            if (already != null && already > 0)
                return;

            jdbcTemplate.update(
                    "UPDATE events SET event_date = COALESCE(start_date, created_at::date) WHERE event_date IS NULL");
            jdbcTemplate.update(
                    "INSERT INTO schema_migrations (name, ran_at) VALUES (?, now()) ON CONFLICT (name) DO NOTHING",
                    MIGRATION_NAME);
        } catch (Exception ignored) {
        }
    }
}
