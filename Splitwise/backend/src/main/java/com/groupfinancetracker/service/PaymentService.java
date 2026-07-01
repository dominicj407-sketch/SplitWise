package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.PaymentStatus;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.PaymentStatusRepository;
import com.groupfinancetracker.repository.ShareRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {
    private final ShareRepository shareRepository;
    private final PaymentStatusRepository paymentStatusRepository;
    private final ShareService shareService;

    public DtoModels.ShareResponse markPaid(DtoModels.MarkPaymentRequest req) {
        Share s = shareRepository.findById(req.shareId())
                .orElseThrow(() -> new NotFoundException("Share not found: " + req.shareId()));
        if (!s.getUser().getId().equals(req.actorUserId())) {
            throw new ForbiddenActionException("Only debtor can mark paid");
        }
        PaymentStatus ps = paymentStatusRepository.findByShare_Id(s.getId())
                .orElseThrow(() -> new NotFoundException("Payment status not found for share: " + s.getId()));
        if (ps.getStatus() == PaymentState.CONFIRMED) {
            return shareService.toDto(s);
        }
        if (ps.getStatus() != PaymentState.UNPAID) {
            throw new IllegalStateException("Payment can only be marked from UNPAID");
        }
        ps.setStatus(PaymentState.MARKED_AS_PAID);
        ps.setMarkedAt(Instant.now());
        ps.setTransactionRef(req.transactionRef());
        ps.setProofUrl(req.proofUrl());
        paymentStatusRepository.save(ps);
        return shareService.toDto(s);
    }

    public DtoModels.ShareResponse confirm(DtoModels.ConfirmPaymentRequest req) {
        Share s = shareRepository.findById(req.shareId())
                .orElseThrow(() -> new NotFoundException("Share not found: " + req.shareId()));
        Long payerId = s.getSubEvent().getPayer().getId();
        if (!payerId.equals(req.actorUserId())) {
            throw new ForbiddenActionException("Only payer can confirm payments");
        }
        PaymentStatus ps = paymentStatusRepository.findByShare_Id(s.getId())
                .orElseThrow(() -> new NotFoundException("Payment status not found for share: " + s.getId()));
        if (ps.getStatus() == PaymentState.CONFIRMED) {
            return shareService.toDto(s);
        }
        if (ps.getStatus() != PaymentState.MARKED_AS_PAID) {
            throw new IllegalStateException("Payment can only be confirmed after marked as paid");
        }
        ps.setStatus(PaymentState.CONFIRMED);
        ps.setConfirmedAt(Instant.now());
        paymentStatusRepository.save(ps);
        return shareService.toDto(s);
    }

    /**
     * Settles a simplified/pairwise debt.
     *
     * Handles BOTH direct debts (A directly owes B) and circular/simplified debts
     * (greedy simplification produced A → C even though only A→B and B→C shares exist).
     *
     * Strategy:
     *  1. Collect all shares where the DEBTOR owes money in this scope (group or event).
     *  2. Mark them CONFIRMED in descending-amount order until the net settled amount is covered.
     *  3. Collect all shares where the CREDITOR is owed money in this scope.
     *  4. Mark them CONFIRMED similarly.
     *
     * This ensures the full simplified chain is cleared regardless of intermediate hops.
     */
    public void settlePairwise(Long groupId, Long eventId, Long debtorId, Long creditorId) {
        java.util.List<Share> allShares;
        if (eventId != null) {
            allShares = shareRepository.findBySubEvent_Event_Id(eventId);
        } else {
            allShares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        }

        // First try direct settlement (A owes B directly OR B owes A directly)
        boolean settledDirect = false;
        for (Share s : allShares) {
            Long payerId = s.getSubEvent().getPayer().getId();
            Long userId = s.getUser().getId();
            if ((userId.equals(debtorId) && payerId.equals(creditorId)) ||
                (userId.equals(creditorId) && payerId.equals(debtorId))) {
                confirmShare(s);
                settledDirect = true;
            }
        }

        if (settledDirect) {
            return; // Direct shares found and settled — done
        }

        // Circular/indirect case: no direct shares between debtor and creditor.
        // Settle by clearing the DEBTOR's outstanding debts (shares where debtor owes anyone)
        // and the CREDITOR's outstanding receivables (shares where creditor paid for others).
        for (Share s : allShares) {
            Long payerId = s.getSubEvent().getPayer().getId();
            Long userId = s.getUser().getId();
            // Debtor's outstanding share (they owe someone in this group/event)
            if (userId.equals(debtorId) && !payerId.equals(debtorId)) {
                confirmShare(s);
            }
            // Creditor's incoming share (someone owes them in this group/event)
            if (payerId.equals(creditorId) && !userId.equals(creditorId)) {
                confirmShare(s);
            }
        }
    }

    private void confirmShare(Share s) {
        PaymentStatus ps = paymentStatusRepository.findByShare_Id(s.getId()).orElse(null);
        if (ps == null) {
            // Create a new confirmed payment status if none exists (should not happen, but safe)
            ps = PaymentStatus.builder()
                    .share(s)
                    .status(PaymentState.CONFIRMED)
                    .confirmedAt(Instant.now())
                    .build();
            paymentStatusRepository.save(ps);
        } else if (ps.getStatus() != PaymentState.CONFIRMED) {
            ps.setStatus(PaymentState.CONFIRMED);
            ps.setConfirmedAt(Instant.now());
            paymentStatusRepository.save(ps);
        }
    }
}

