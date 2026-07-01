package com.groupfinancetracker.scheduler;

import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.PaymentStatus;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.entity.SubEvent;
import com.groupfinancetracker.repository.PaymentStatusRepository;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.SubEventRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class RecurringExpenseScheduler {
    private final SubEventRepository subEventRepository;
    private final ShareRepository shareRepository;
    private final PaymentStatusRepository paymentStatusRepository;

    // Check every hour — recurring events run on real-time intervals (daily/weekly/monthly)
    @Scheduled(fixedDelay = 3_600_000)
    @Transactional
    public void processRecurringExpenses() {
        Instant now = Instant.now();
        List<SubEvent> dueExpenses = subEventRepository.findByIsRecurringTrueAndNextRunDateBefore(now);
        for (SubEvent parent : dueExpenses) {
            log.info("Processing recurring sub-event '{}' (id={}, period={})",
                    parent.getDescription(), parent.getId(), parent.getRecurringPeriod());

            // Clone the SubEvent
            SubEvent child = SubEvent.builder()
                    .description(parent.getDescription() + " (Recurring)")
                    .totalAmount(parent.getTotalAmount())
                    .payer(parent.getPayer())
                    .event(parent.getEvent())
                    .timestamp(now)
                    .subEventDate(LocalDate.now())
                    .weekNumber(parent.getWeekNumber())
                    .year(parent.getYear())
                    .isRecurring(false)
                    .build();

            child = subEventRepository.save(child);

            // Replicate shares
            for (Share parentShare : parent.getShares()) {
                Share childShare = Share.builder()
                        .subEvent(child)
                        .user(parentShare.getUser())
                        .amount(parentShare.getAmount())
                        .build();

                childShare = shareRepository.save(childShare);

                PaymentStatus childPs;
                if (childShare.getUser().getId().equals(child.getPayer().getId())) {
                    childPs = PaymentStatus.builder()
                            .share(childShare)
                            .status(PaymentState.CONFIRMED)
                            .markedAt(now)
                            .confirmedAt(now)
                            .build();
                } else {
                    childPs = PaymentStatus.builder()
                            .share(childShare)
                            .status(PaymentState.UNPAID)
                            .build();
                }
                paymentStatusRepository.save(childPs);
                childShare.setPaymentStatus(childPs);
            }

            // Advance the parent to the next schedule date
            Instant nextRun = computeNextRunDate(parent.getNextRunDate(), parent.getRecurringPeriod());
            parent.setNextRunDate(nextRun);
            subEventRepository.save(parent);
            log.info("Next run for '{}' scheduled at {}", parent.getDescription(), nextRun);
        }
    }

    private Instant computeNextRunDate(Instant base, String period) {
        if (period == null) return null;
        return switch (period.toUpperCase()) {
            case "DAILY"   -> base.plus(1, ChronoUnit.DAYS);
            case "WEEKLY"  -> base.plus(7, ChronoUnit.DAYS);
            case "MONTHLY" -> base.plus(30, ChronoUnit.DAYS);
            default        -> base.plus(30, ChronoUnit.DAYS);
        };
    }
}
