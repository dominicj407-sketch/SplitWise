package com.groupfinancetracker.config;

import com.groupfinancetracker.entity.Event;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Settlement;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.SettlementRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * One-time migration: convert every pre-existing CONFIRMED share into an equivalent
 * ledger settlement so balances (now computed as shares - settlements) do not jump
 * when the ledger goes live. Idempotent via the exists-guard so accidental re-runs
 * do not double-credit.
 */
@Component
@RequiredArgsConstructor
public class ConfirmedShareBackfill {
    private final ShareRepository shareRepository;
    private final SettlementRepository settlementRepository;

    @PostConstruct
    @Transactional
    public void backfill() {
        try {
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
        } catch (Exception ignored) {
        }
    }
}
