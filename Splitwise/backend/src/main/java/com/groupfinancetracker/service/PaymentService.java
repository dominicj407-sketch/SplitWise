package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.Event;
import com.groupfinancetracker.entity.Group;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.PaymentStatus;
import com.groupfinancetracker.entity.Settlement;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.entity.User;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.EventRepository;
import com.groupfinancetracker.repository.GroupRepository;
import com.groupfinancetracker.repository.PaymentStatusRepository;
import com.groupfinancetracker.repository.SettlementRepository;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {
    private final ShareRepository shareRepository;
    private final PaymentStatusRepository paymentStatusRepository;
    private final ShareService shareService;
    private final SettlementRepository settlementRepository;
    private final EventRepository eventRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

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

        // Ledger: a confirmed itemized payment is a real repayment debtor -> payer for the share amount.
        Long debtorId = s.getUser().getId();
        if (!debtorId.equals(payerId)) {
            Event event = s.getSubEvent().getEvent();
            settlementRepository.save(Settlement.builder()
                    .group(event.getGroup())
                    .event(event)
                    .subEvent(s.getSubEvent())
                    .fromUser(s.getUser())
                    .toUser(s.getSubEvent().getPayer())
                    .amount(s.getAmount())
                    .createdAt(Instant.now())
                    .createdBy(s.getSubEvent().getPayer())
                    .note("Itemized share confirmed")
                    .build());
        }
        return shareService.toDto(s);
    }

    private boolean isMember(Group group, Long userId) {
        if (userId == null) return false;
        return group.getCreator().getId().equals(userId)
                || group.getMembers().stream().anyMatch(u -> u.getId().equals(userId));
    }

    /**
     * Marks a simplified/pairwise settlement of {@code amount} from debtor to creditor as paid.
     * Scoped to an event when {@code eventId} is provided, otherwise to the group. Mirrors
     * {@link #markPaid}: only the debtor can mark it, and it does not affect balances until the
     * creditor confirms it via {@link #confirmPairwiseSettlement}.
     */
    public DtoModels.SettlementLedgerEntry settlePairwise(Long groupId, Long eventId, Long fromUserId,
            Long toUserId, BigDecimal amount, String transactionRef, String proofUrl, Long actorId) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Settlement amount must be positive");
        }
        Group group;
        Event event = null;
        if (eventId != null) {
            event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new NotFoundException("Event not found: " + eventId));
            group = event.getGroup();
        } else {
            group = groupRepository.findById(groupId)
                    .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        }
        // Authorization: only the debtor can mark a settlement as paid (matches markPaid on shares).
        if (!isMember(group, actorId)) {
            throw new ForbiddenActionException("Only a group member can record settlements");
        }
        if (!actorId.equals(fromUserId)) {
            throw new ForbiddenActionException("Only the debtor can mark a settlement as paid");
        }
        if (!isMember(group, fromUserId) || !isMember(group, toUserId)) {
            throw new IllegalArgumentException("Both parties must be members of the group");
        }
        User from = userRepository.findById(fromUserId)
                .orElseThrow(() -> new NotFoundException("User not found: " + fromUserId));
        User to = userRepository.findById(toUserId)
                .orElseThrow(() -> new NotFoundException("User not found: " + toUserId));
        Settlement s = settlementRepository.save(Settlement.builder()
                .group(group)
                .event(event)
                .fromUser(from)
                .toUser(to)
                .amount(amount)
                .createdAt(Instant.now())
                .createdBy(from)
                .note("Pairwise settlement")
                .status(PaymentState.MARKED_AS_PAID)
                .markedAt(Instant.now())
                .transactionRef(transactionRef)
                .proofUrl(proofUrl)
                .build());
        return toLedgerEntry(s);
    }

    /** Only the creditor can confirm; only then does the settlement count toward balances. */
    public DtoModels.SettlementLedgerEntry confirmPairwiseSettlement(Long settlementId, Long actorId) {
        Settlement s = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new NotFoundException("Settlement not found: " + settlementId));
        if (!actorId.equals(s.getToUser().getId())) {
            throw new ForbiddenActionException("Only the creditor can confirm a settlement");
        }
        if (s.getStatus() == PaymentState.CONFIRMED) {
            return toLedgerEntry(s);
        }
        if (s.getStatus() != PaymentState.MARKED_AS_PAID) {
            throw new IllegalStateException("Settlement can only be confirmed after being marked as paid");
        }
        s.setStatus(PaymentState.CONFIRMED);
        s.setConfirmedAt(Instant.now());
        settlementRepository.save(s);
        cascadeConfirmDirectShares(s.getGroup().getId(), s.getFromUser(), s.getToUser());
        return toLedgerEntry(s);
    }

    /**
     * After a pairwise settlement is confirmed, mark the expense shares it resolves as CONFIRMED
     * too -- so the itemized expense list reflects the payment, not just the group's aggregate net.
     * Two cases, both safe to attribute:
     *   1. Direct pair: this settlement fully clears what the two parties owe each other directly
     *      (their raw balance, ignoring redirection, is now zero) -- covers the common case of one
     *      net payment closing out several expenses between the same two people.
     *   2. Whole group: the settlement was the last piece needed to fully balance everyone in the
     *      group (the simplified payment list is now empty) -- covers circular/indirect debts (e.g.
     *      A owes B, B owes C, C owes A), where cash was redirected through a third party so no
     *      single pair's raw balance ever reaches zero, but the group as a whole is provably settled.
     */
    private void cascadeConfirmDirectShares(Long groupId, User a, User b) {
        var allShares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        var effectiveSettlements = settlementRepository.findByGroup_Id(groupId).stream()
                .filter(st -> st.getStatus() == null || st.getStatus() == PaymentState.CONFIRMED)
                .toList();

        var debtRows = allShares.stream()
                .map(sh -> new com.groupfinancetracker.settlement.SettlementCalculator.DebtRow(
                        sh.getUser().getId(), sh.getSubEvent().getPayer().getId(), sh.getAmount()))
                .toList();
        var settlementRows = effectiveSettlements.stream()
                .map(st -> new com.groupfinancetracker.settlement.SettlementCalculator.SettlementRow(
                        st.getFromUser().getId(), st.getToUser().getId(), st.getAmount()))
                .toList();

        var rawEdges = com.groupfinancetracker.settlement.SettlementCalculator.rawPairwise(debtRows, settlementRows);
        boolean pairStillOwesDirectly = rawEdges.stream().anyMatch(e ->
                (e.fromId().equals(a.getId()) && e.toId().equals(b.getId())) ||
                (e.fromId().equals(b.getId()) && e.toId().equals(a.getId())));

        var net = com.groupfinancetracker.settlement.SettlementCalculator.netBalances(debtRows, settlementRows);
        boolean groupFullySettled = com.groupfinancetracker.settlement.SettlementCalculator.simplify(net).isEmpty();

        Instant now = Instant.now();
        for (Share sh : allShares) {
            PaymentStatus ps = sh.getPaymentStatus();
            if (ps == null || ps.getStatus() == PaymentState.CONFIRMED) continue;

            Long debtorId = sh.getUser().getId();
            Long creditorId = sh.getSubEvent().getPayer().getId();
            boolean isMutualPairOfThisSettlement = (debtorId.equals(a.getId()) && creditorId.equals(b.getId()))
                    || (debtorId.equals(b.getId()) && creditorId.equals(a.getId()));

            if (!groupFullySettled && !(isMutualPairOfThisSettlement && !pairStillOwesDirectly)) continue;

            ps.setStatus(PaymentState.CONFIRMED);
            ps.setConfirmedAt(now);
            paymentStatusRepository.save(ps);
        }
    }

    private DtoModels.SettlementLedgerEntry toLedgerEntry(Settlement s) {
        String status = s.getStatus() == null ? "CONFIRMED" : s.getStatus().name();
        return new DtoModels.SettlementLedgerEntry(
                s.getId(), s.getGroup().getId(),
                s.getFromUser().getId(), s.getFromUser().getName(),
                s.getToUser().getId(), s.getToUser().getName(),
                s.getAmount(), status, s.getMarkedAt(), s.getConfirmedAt(), s.getCreatedAt(),
                s.getTransactionRef(), s.getProofUrl(), s.getNote());
    }
}
