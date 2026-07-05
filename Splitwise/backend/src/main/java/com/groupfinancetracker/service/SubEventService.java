package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.*;
import com.groupfinancetracker.exception.ForbiddenActionException;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class SubEventService {
    private final SubEventRepository subEventRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final ShareRepository shareRepository;
    private final PaymentStatusRepository paymentStatusRepository;
    private final SettlementRepository settlementRepository;

    public DtoModels.SubEventResponse create(DtoModels.CreateSubEventRequest req) {
        Event event = eventRepository.findById(req.eventId())
                .orElseThrow(() -> new NotFoundException("Event not found: " + req.eventId()));
        User payer = userRepository.findById(req.payerId())
                .orElseThrow(() -> new NotFoundException("Payer not found: " + req.payerId()));
        validatePayerIsMember(event, payer.getId());

        // Validate date
        if (req.subEventDate().isBefore(event.getStartDate()) || req.subEventDate().isAfter(event.getEndDate())) {
            throw new IllegalArgumentException("Expense date must be within event dates (" + event.getStartDate()
                    + " to " + event.getEndDate() + ")");
        }

        int weekIndex = computeWeekIndex(req.subEventDate());

        SubEvent se = SubEvent.builder()
                .description(req.description())
                .totalAmount(req.totalAmount())
                .payer(payer)
                .event(event)
                .timestamp(Instant.now())
                .subEventDate(req.subEventDate())
                .weekNumber(weekIndex)
                .year(1) // single sequence; we don't use calendar years for custom weeks
                .isRecurring(req.isRecurring())
                .recurringPeriod(req.recurringPeriod())
                .nextRunDate(req.isRecurring() ? computeNextRunDate(Instant.now(), req.recurringPeriod()) : null)
                .build();
        se = subEventRepository.save(se);

        persistShares(se, payer, req.shares());

        return toDto(se);
    }

    public DtoModels.SubEventResponse update(Long id, DtoModels.UpdateSubEventRequest req, Long actorId) {
        SubEvent se = subEventRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SubEvent not found: " + id));
        checkCanModify(se, actorId);

        Event event = se.getEvent();
        User payer = userRepository.findById(req.payerId())
                .orElseThrow(() -> new NotFoundException("Payer not found: " + req.payerId()));
        validatePayerIsMember(event, payer.getId());

        if (req.subEventDate().isBefore(event.getStartDate()) || req.subEventDate().isAfter(event.getEndDate())) {
            throw new IllegalArgumentException("Expense date must be within event dates (" + event.getStartDate()
                    + " to " + event.getEndDate() + ")");
        }

        // Reset the itemized ledger rows and shares for this expense, then rebuild them.
        settlementRepository.deleteBySubEvent_Id(se.getId());
        List<Share> oldShares = shareRepository.findBySubEvent_Id(se.getId());
        shareRepository.deleteAll(oldShares); // cascades to payment statuses

        se.setDescription(req.description());
        se.setTotalAmount(req.totalAmount());
        se.setPayer(payer);
        se.setSubEventDate(req.subEventDate());
        se.setWeekNumber(computeWeekIndex(req.subEventDate()));
        se.setYear(1);
        se.setRecurring(req.isRecurring());
        se.setRecurringPeriod(req.recurringPeriod());
        se.setNextRunDate(req.isRecurring() ? computeNextRunDate(Instant.now(), req.recurringPeriod()) : null);
        se = subEventRepository.save(se);

        persistShares(se, payer, req.shares());

        return toDto(se);
    }

    public void delete(Long id, Long actorId) {
        SubEvent se = subEventRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SubEvent not found: " + id));
        checkCanModify(se, actorId);
        settlementRepository.deleteBySubEvent_Id(se.getId());
        subEventRepository.delete(se); // cascades to shares and their payment statuses
    }

    private void persistShares(SubEvent se, User payer, List<DtoModels.ShareSplit> splits) {
        BigDecimal sum = BigDecimal.ZERO;
        for (DtoModels.ShareSplit split : splits) {
            User u = userRepository.findById(split.userId())
                    .orElseThrow(() -> new NotFoundException("User not found: " + split.userId()));
            Share s = Share.builder()
                    .subEvent(se)
                    .user(u)
                    .amount(split.amount())
                    .build();
            s = shareRepository.save(s);
            PaymentStatus ps;
            if (u.getId().equals(payer.getId())) {
                ps = PaymentStatus.builder()
                        .share(s)
                        .status(PaymentState.CONFIRMED)
                        .markedAt(Instant.now())
                        .confirmedAt(Instant.now())
                        .build();
            } else {
                ps = PaymentStatus.builder()
                        .share(s)
                        .status(PaymentState.UNPAID)
                        .build();
            }
            paymentStatusRepository.save(ps);
            s.setPaymentStatus(ps);
            sum = sum.add(split.amount());
        }

        BigDecimal diff = sum.subtract(se.getTotalAmount()).abs();
        if (diff.compareTo(new BigDecimal("0.01")) > 0) {
            throw new IllegalStateException("Share splits must sum to total amount");
        }
    }

    private void validatePayerIsMember(Event event, Long payerId) {
        boolean isMember = event.getGroup().getMembers().stream().anyMatch(u -> u.getId().equals(payerId))
                || event.getGroup().getCreator().getId().equals(payerId);
        if (!isMember) {
            throw new IllegalArgumentException("Payer must be a member of the group");
        }
    }

    private void checkCanModify(SubEvent se, Long actorId) {
        Long eventCreatorId = se.getEvent().getCreator().getId();
        Long payerId = se.getPayer().getId();
        if (actorId == null || (!actorId.equals(eventCreatorId) && !actorId.equals(payerId))) {
            throw new ForbiddenActionException("Only the event creator or the expense payer can modify this expense");
        }
    }

    private int computeWeekIndex(LocalDate date) {
        LocalDate base = subEventRepository.findEarliestSubEventDate();
        if (base == null)
            base = date;
        int weekIndex = (int) ChronoUnit.WEEKS.between(base, date) + 1; // week-1 based
        return Math.max(weekIndex, 1);
    }

    public List<DtoModels.SubEventResponse> listByEvent(Long eventId) {
        return subEventRepository.findByEvent_Id(eventId).stream().map(this::toDto).toList();
    }

    public DtoModels.SubEventResponse get(Long id) {
        SubEvent se = subEventRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("SubEvent not found: " + id));
        return toDto(se);
    }

    private Instant computeNextRunDate(Instant base, String period) {
        if (period == null) return null;
        switch (period.toUpperCase()) {
            case "DAILY":
                return base.plus(1, java.time.temporal.ChronoUnit.DAYS);
            case "WEEKLY":
                return base.plus(7, java.time.temporal.ChronoUnit.DAYS);
            case "MONTHLY":
                return base.plus(30, java.time.temporal.ChronoUnit.DAYS);
            default:
                return null;
        }
    }

    private DtoModels.SubEventResponse toDto(SubEvent se) {
        return new DtoModels.SubEventResponse(se.getId(), se.getDescription(), se.getTotalAmount(),
                se.getPayer().getId(), se.getEvent().getId(), se.getEvent().getCreator().getId(), se.getTimestamp(),
                se.getSubEventDate(), se.getWeekNumber(), se.getYear(), se.isRecurring(), se.getRecurringPeriod(), se.getNextRunDate());
    }

    public List<DtoModels.WeeklyReportItem> getWeeklyReport(Long userId) {
        List<SubEvent> subEvents = subEventRepository.findInvolvedSubEvents(userId);
        List<DtoModels.WeeklyReportItem> report = new ArrayList<>();

        for (SubEvent se : subEvents) {
            boolean isPayer = se.getPayer().getId().equals(userId);

            Optional<Share> userShareOpt = se.getShares().stream()
                    .filter(s -> s.getUser().getId().equals(userId))
                    .findFirst();

            boolean isSharer = userShareOpt.isPresent();

            String role;
            if (isPayer && isSharer) {
                role = "PAYER_AND_SHARER";
            } else if (isPayer) {
                role = "PAYER";
            } else {
                role = "SHARER";
            }

            BigDecimal myShareAmount = isSharer ? userShareOpt.get().getAmount() : BigDecimal.ZERO;

            String status = "N/A";
            if (isSharer) {
                Share s = userShareOpt.get();
                if (s.getPaymentStatus() != null) {
                    status = s.getPaymentStatus().getStatus().name();
                } else {
                    status = "PENDING";
                }
            }

            report.add(new DtoModels.WeeklyReportItem(
                    se.getId(),
                    se.getDescription(),
                    se.getTotalAmount(),
                    se.getSubEventDate(),
                    se.getWeekNumber(),
                    se.getYear(),
                    se.getEvent().getId(),
                    se.getEvent().getName(),
                    se.getEvent().getGroup().getId(),
                    se.getEvent().getGroup().getName(),
                    se.getPayer().getId(),
                    se.getPayer().getName(),
                    role,
                    myShareAmount,
                    status
            ));
        }
        return report;
    }
}
