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

    /**
     * Records a settlement (repayment) of {@code amount} from debtor to creditor in the ledger.
     * Scoped to an event when {@code eventId} is provided, otherwise to the group.
     */
    public void settlePairwise(Long groupId, Long eventId, Long fromUserId, Long toUserId, BigDecimal amount) {
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
        User from = userRepository.findById(fromUserId)
                .orElseThrow(() -> new NotFoundException("User not found: " + fromUserId));
        User to = userRepository.findById(toUserId)
                .orElseThrow(() -> new NotFoundException("User not found: " + toUserId));
        settlementRepository.save(Settlement.builder()
                .group(group)
                .event(event)
                .fromUser(from)
                .toUser(to)
                .amount(amount)
                .createdAt(Instant.now())
                .createdBy(from)
                .note("Pairwise settlement")
                .build());
    }
}
