package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.Group;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.GroupRepository;
import com.groupfinancetracker.repository.ShareRepository;
import jakarta.transaction.Transactional;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SettlementService {
    private final ShareRepository shareRepository;
    private final GroupRepository groupRepository;
    private final ShareService shareService;
    private final UserService userService;
    private final com.groupfinancetracker.repository.SubEventRepository subEventRepository;

    public DtoModels.GroupSettlementSummary groupSummary(@NonNull Long groupId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        List<Share> shares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        Map<Long, BigDecimal> balances = new HashMap<>();
        int outstanding = 0;
        for (Share s : shares) {
            if (s.getPaymentStatus() != null && s.getPaymentStatus().getStatus() == PaymentState.CONFIRMED) {
                continue;
            }
            Long payerId = s.getSubEvent().getPayer().getId();
            Long debtorId = s.getUser().getId();
            BigDecimal amt = s.getAmount();
            balances.merge(payerId, amt, BigDecimal::add);
            balances.merge(debtorId, amt.negate(), BigDecimal::add);
            if (s.getPaymentStatus() != null && s.getPaymentStatus().getStatus() == PaymentState.MARKED_AS_PAID) {
                outstanding++;
            }
        }
        List<DtoModels.UserBalance> list = balances.entrySet().stream()
                .map(e -> new DtoModels.UserBalance(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(DtoModels.UserBalance::userId))
                .toList();
        return new DtoModels.GroupSettlementSummary(g.getId(), list, outstanding);
    }

    public DtoModels.UserOutstandingDebts userDebts(@NonNull Long userId) {
        var shares = shareRepository.findByUser_IdAndPaymentStatus_StatusNot(userId, PaymentState.CONFIRMED);
        var debts = shares.stream().map(shareService::toDto).toList();
        return new DtoModels.UserOutstandingDebts(userId, debts);
    }

    public DtoModels.GroupPairwise groupPairwise(@NonNull Long groupId) {
        if (!groupRepository.existsById(groupId))
            throw new NotFoundException("Group not found: " + groupId);
        List<Share> shares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        List<DtoModels.PairwiseBalance> pairwiseBalances = calculateSimplifiedPairwise(shares);

        List<DtoModels.PairwiseOwe> owes = new ArrayList<>();
        for (DtoModels.PairwiseBalance pb : pairwiseBalances) {
            owes.add(new DtoModels.PairwiseOwe(pb.user1Id(), pb.user2Id(), pb.amount(), pb.description()));
        }

        return new DtoModels.GroupPairwise(groupId, owes, pairwiseBalances);
    }

    public DtoModels.WeeklySettlementResponse weeklySettlements(@NonNull Long groupId, @NonNull Integer weekNumber,
            @NonNull Integer year, Long currentUserId) {
        if (!groupRepository.existsById(groupId))
            throw new NotFoundException("Group not found: " + groupId);
        List<Share> shares = shareRepository
                .findBySubEvent_Event_Group_IdAndSubEvent_WeekNumberAndSubEvent_Year(groupId, weekNumber, year);

        List<DtoModels.PairwiseBalance> pairwise = calculateSimplifiedPairwise(shares);

        List<DtoModels.ToPayEntry> toPay = new ArrayList<>();
        List<DtoModels.ToReceiveEntry> toReceive = new ArrayList<>();

        for (DtoModels.PairwiseBalance pb : pairwise) {
            if (currentUserId != null) {
                if (Objects.equals(currentUserId, pb.user1Id())) {
                    toPay.add(new DtoModels.ToPayEntry(pb.user2Id(), pb.user2(), pb.amount()));
                } else if (Objects.equals(currentUserId, pb.user2Id())) {
                    toReceive.add(new DtoModels.ToReceiveEntry(pb.user1Id(), pb.user1(), pb.amount()));
                }
            }
        }

        toPay.sort(Comparator.comparing(DtoModels.ToPayEntry::toUser));
        toReceive.sort(Comparator.comparing(DtoModels.ToReceiveEntry::fromUser));

        return new DtoModels.WeeklySettlementResponse(weekNumber, year, currentUserId, toPay, toReceive, pairwise);
    }

    public DtoModels.EventSettlementResponse eventPairwise(@NonNull Long eventId) {
        List<Share> shares = shareRepository.findBySubEvent_Event_Id(eventId);
        List<DtoModels.PairwiseBalance> pairwise = calculateSimplifiedPairwise(shares);
        return new DtoModels.EventSettlementResponse(eventId, pairwise);
    }

    private List<DtoModels.PairwiseBalance> calculateSimplifiedPairwise(List<Share> shares) {
        Map<Long, BigDecimal> netBalances = new HashMap<>();
        Map<Long, String> userNames = new HashMap<>();
        Map<String, BigDecimal> rawPairwise = new HashMap<>();

        for (Share s : shares) {
            if (s.getPaymentStatus() != null && s.getPaymentStatus().getStatus() == PaymentState.CONFIRMED) {
                continue;
            }
            Long fromId = s.getUser().getId();
            Long toId = s.getSubEvent().getPayer().getId();
            BigDecimal amount = s.getAmount();

            if (Objects.equals(fromId, toId)) {
                continue;
            }

            netBalances.merge(fromId, amount.negate(), BigDecimal::add);
            netBalances.merge(toId, amount, BigDecimal::add);

            userNames.putIfAbsent(fromId, null);
            userNames.putIfAbsent(toId, null);

            String key = fromId + "->" + toId;
            rawPairwise.merge(key, amount, BigDecimal::add);
        }

        Map<String, BigDecimal> originalDirectNet = new HashMap<>();
        for (String key : rawPairwise.keySet()) {
            String[] parts = key.split("->");
            String rev = parts[1] + "->" + parts[0];
            BigDecimal a = rawPairwise.getOrDefault(key, BigDecimal.ZERO);
            BigDecimal b = rawPairwise.getOrDefault(rev, BigDecimal.ZERO);
            if (a.compareTo(b) > 0) {
                originalDirectNet.put(key, a.subtract(b));
            }
        }

        userNames.replaceAll((id, v) -> {
            try {
                return userService.get(id).name();
            } catch (Exception e) {
                return String.valueOf(id);
            }
        });

        List<UserBalanceTemp> debtors = new ArrayList<>();
        List<UserBalanceTemp> creditors = new ArrayList<>();

        for (Map.Entry<Long, BigDecimal> entry : netBalances.entrySet()) {
            BigDecimal bal = entry.getValue();
            if (bal.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new UserBalanceTemp(entry.getKey(), bal));
            } else if (bal.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new UserBalanceTemp(entry.getKey(), bal));
            }
        }

        List<DtoModels.PairwiseBalance> result = new ArrayList<>();

        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            debtors.sort(Comparator.comparing(UserBalanceTemp::getBalance));
            creditors.sort((c1, c2) -> c2.getBalance().compareTo(c1.getBalance()));

            UserBalanceTemp debtor = debtors.get(0);
            UserBalanceTemp creditor = creditors.get(0);

            BigDecimal dVal = debtor.getBalance().negate();
            BigDecimal cVal = creditor.getBalance();

            BigDecimal amount = dVal.min(cVal);

            debtor.setBalance(debtor.getBalance().add(amount));
            creditor.setBalance(creditor.getBalance().subtract(amount));

            if (debtor.getBalance().abs().compareTo(new BigDecimal("0.005")) < 0) {
                debtors.remove(0);
            }
            if (creditor.getBalance().abs().compareTo(new BigDecimal("0.005")) < 0) {
                creditors.remove(0);
            }

            if (amount.compareTo(new BigDecimal("0.005")) > 0) {
                Long from = debtor.getUserId();
                Long to = creditor.getUserId();
                String fromName = userNames.getOrDefault(from, String.valueOf(from));
                String toName = userNames.getOrDefault(to, String.valueOf(to));

                List<String> details = new ArrayList<>();
                for (Map.Entry<String, BigDecimal> direct : originalDirectNet.entrySet()) {
                    String[] parts = direct.getKey().split("->");
                    Long u1 = Long.parseLong(parts[0]);
                    Long u2 = Long.parseLong(parts[1]);

                    if (u1.equals(from) || u2.equals(from) || u1.equals(to) || u2.equals(to)) {
                        String u1Name = userNames.getOrDefault(u1, String.valueOf(u1));
                        String u2Name = userNames.getOrDefault(u2, String.valueOf(u2));
                        details.add(u1Name + " owed " + u2Name + " \u20B9" + direct.getValue().setScale(2, java.math.RoundingMode.HALF_UP));
                    }
                }

                String description = "Simplified from direct balances: " + String.join(", ", details);

                result.add(new DtoModels.PairwiseBalance(
                        from, fromName,
                        to, toName,
                        amount,
                        fromName,
                        description
                ));
            }
        }

        result.sort(Comparator.comparing(DtoModels.PairwiseBalance::user1Id)
                .thenComparing(DtoModels.PairwiseBalance::user2Id));
        return result;
    }

    private static class UserBalanceTemp {
        private final Long userId;
        private BigDecimal balance;

        public UserBalanceTemp(Long userId, BigDecimal balance) {
            this.userId = userId;
            this.balance = balance;
        }

        public Long getUserId() { return userId; }
        public BigDecimal getBalance() { return balance; }
        public void setBalance(BigDecimal balance) { this.balance = balance; }
    }

    public DtoModels.SpendResponse mySpendForEvent(@NonNull Long eventId, @NonNull Long actorUserId) {
        java.math.BigDecimal sum = subEventRepository.sumTotalByEventAndPayer(eventId, actorUserId);
        return new DtoModels.SpendResponse(sum);
    }

    public DtoModels.SpendResponse mySpendForGroup(@NonNull Long groupId, @NonNull Long actorUserId) {
        java.math.BigDecimal sum = subEventRepository.sumTotalByGroupAndPayer(groupId, actorUserId);
        return new DtoModels.SpendResponse(sum);
    }
}
