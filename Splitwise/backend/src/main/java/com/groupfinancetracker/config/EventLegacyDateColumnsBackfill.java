package com.groupfinancetracker.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time migration: drops the legacy {@code start_date}/{@code end_date} columns on
 * {@code events}. These predate the current single-{@code event_date} model; Hibernate's
 * ddl-auto=update only ever adds columns, so the old NOT NULL columns stayed behind and
 * rejected every insert (Event no longer sets them), failing with
 * "null value in column end_date violates not-null constraint".
 *
 * <p>Gated by the same {@code schema_migrations} sentinel other backfills use so it runs once.
 */
@Component
@RequiredArgsConstructor
public class EventLegacyDateColumnsBackfill {
    private static final String MIGRATION_NAME = "event_legacy_date_columns_drop";

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    @Transactional
    public void migrate() {
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, ran_at TIMESTAMPTZ)");
            Integer already = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM schema_migrations WHERE name = ?", Integer.class, MIGRATION_NAME);
            if (already != null && already > 0)
                return;

            jdbcTemplate.execute("ALTER TABLE events DROP COLUMN IF EXISTS start_date");
            jdbcTemplate.execute("ALTER TABLE events DROP COLUMN IF EXISTS end_date");

            jdbcTemplate.update(
                    "INSERT INTO schema_migrations (name, ran_at) VALUES (?, now()) ON CONFLICT (name) DO NOTHING",
                    MIGRATION_NAME);
        } catch (Exception ignored) {
        }
    }
}
