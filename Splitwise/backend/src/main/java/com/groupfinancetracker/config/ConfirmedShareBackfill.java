package com.groupfinancetracker.config;

import com.groupfinancetracker.entity.Event;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Settlement;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.SettlementRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * One-time migration: convert every pre-existing CONFIRMED share into an equivalent
 * ledger settlement so balances (now computed as shares - settlements) do not jump
 * when the ledger goes live. Idempotent via the exists-guard so accidental re-runs
 * do not double-credit.
 *
 * <p>Gated by a persisted sentinel ({@link #MIGRATION_NAME} in {@code schema_migrations})
 * so it truly runs once. Without this, @PostConstruct fires on every backend restart, and
 * the exists-guard (matched on group+fromUser+toUser+amount) does not recognize shares that
 * {@link com.groupfinancetracker.service.PaymentService#confirmPairwiseSettlement} cascade-confirms
 * without a matching per-share Settlement (by design -- one net settlement covers several shares).
 * Re-running would misclassify those as "pre-existing confirmed, never backfilled" and create
 * extra phantom settlements, over-crediting the debtor and flipping already-settled balances.
 */
@Component
@RequiredArgsConstructor
public class ConfirmedShareBackfill {
    private static final String MIGRATION_NAME = "confirmed_share_backfill";

    private final ShareRepository shareRepository;
    private final SettlementRepository settlementRepository;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    @Transactional
    public void backfill() {
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, ran_at TIMESTAMPTZ)");
            Integer already = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM schema_migrations WHERE name = ?", Integer.class, MIGRATION_NAME);
            if (already != null && already > 0)
                return;

            List<Share> shares = shareRepository.findAll();
            for (Share s : shares) {
                if (s.getPaymentStatus() == null
                        || s.getPaymentStatus().getStatus() != PaymentState.CONFIRMED) continue;
                Long debtorId = s.getUser().getId();
                Long payerId = s.getSubEvent().getPayer().getId();
                if (debtorId.equals(payerId)) continue; // payer's own self-share, never a debt
                Event event = s.getSubEvent().getEvent();
                Long groupId = event.getGroup().getId();
                if (settlementRepository.existsByGroup_IdAndFromUser_IdAndToUser_IdAndAmount(
                        groupId, debtorId, payerId, s.getAmount())) continue; // idempotent
                settlementRepository.save(Settlement.builder()
                        .group(event.getGroup())
                        .event(event)
                        .subEvent(s.getSubEvent())
                        .fromUser(s.getUser())
                        .toUser(s.getSubEvent().getPayer())
                        .amount(s.getAmount())
                        .createdAt(Instant.now())
                        .createdBy(s.getSubEvent().getPayer())
                        .note("Backfill: pre-existing confirmed share")
                        .build());
            }
            jdbcTemplate.update(
                    "INSERT INTO schema_migrations (name, ran_at) VALUES (?, now()) ON CONFLICT (name) DO NOTHING",
                    MIGRATION_NAME);
        } catch (Exception ignored) {
        }
    }
}
