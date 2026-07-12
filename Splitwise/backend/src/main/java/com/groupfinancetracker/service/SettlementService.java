package com.groupfinancetracker.service;

import com.groupfinancetracker.dto.DtoModels;
import com.groupfinancetracker.entity.Group;
import com.groupfinancetracker.entity.PaymentState;
import com.groupfinancetracker.entity.Share;
import com.groupfinancetracker.entity.Settlement;
import com.groupfinancetracker.exception.NotFoundException;
import com.groupfinancetracker.repository.GroupRepository;
import com.groupfinancetracker.repository.ShareRepository;
import com.groupfinancetracker.repository.SettlementRepository;
import com.groupfinancetracker.settlement.SettlementCalculator;
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
    private final SettlementRepository settlementRepository;

    public DtoModels.GroupSettlementSummary groupSummary(@NonNull Long groupId) {
        Group g = groupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
        List<Share> shares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        List<Settlement> settlements = settlementRepository.findByGroup_Id(groupId);
        Map<Long, BigDecimal> net = SettlementCalculator.netBalances(toDebtRows(shares), toSettlementRows(settlements));
        int outstanding = (int) shares.stream()
                .filter(s -> s.getPaymentStatus() != null
                        && s.getPaymentStatus().getStatus() == PaymentState.MARKED_AS_PAID)
                .count();
        List<DtoModels.UserBalance> list = net.entrySet().stream()
                .filter(e -> e.getValue().abs().compareTo(SettlementCalculator.EPSILON) >= 0)
                .map(e -> new DtoModels.UserBalance(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(DtoModels.UserBalance::userId))
                .toList();
        return new DtoModels.GroupSettlementSummary(g.getId(), list, outstanding);
    }

    // Itemized view only; net balances live in groupSummary (shares - settlements).
    public DtoModels.UserOutstandingDebts userDebts(@NonNull Long userId) {
        var shares = shareRepository.findByUser_IdAndPaymentStatus_StatusNot(userId, PaymentState.CONFIRMED);
        var debts = shares.stream().map(shareService::toDto).toList();
        return new DtoModels.UserOutstandingDebts(userId, debts);
    }

    public DtoModels.GroupPairwise groupPairwise(@NonNull Long groupId) {
        if (!groupRepository.existsById(groupId))
            throw new NotFoundException("Group not found: " + groupId);
        List<Share> shares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
        List<Settlement> settlements = settlementRepository.findByGroup_Id(groupId);
        List<DtoModels.PairwiseBalance> pairwiseBalances = calculateSimplifiedPairwise(shares, settlements);

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
        List<Settlement> settlements = settlementRepository
                .findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(groupId, weekNumber, year);

        List<DtoModels.PairwiseBalance> pairwise = calculateSimplifiedPairwise(shares, settlements);

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
        List<Settlement> settlements = settlementRepository.findByEvent_Id(eventId);
        List<DtoModels.PairwiseBalance> pairwise = calculateSimplifiedPairwise(shares, settlements);
        return new DtoModels.EventSettlementResponse(eventId, pairwise);
    }

    private List<DtoModels.PairwiseBalance> calculateSimplifiedPairwise(
            List<Share> shares, List<Settlement> settlements) {
        Map<Long, BigDecimal> net = SettlementCalculator.netBalances(toDebtRows(shares), toSettlementRows(settlements));
        List<SettlementCalculator.Edge> edges = SettlementCalculator.simplify(net);
        List<DtoModels.PairwiseBalance> result = new ArrayList<>();
        for (SettlementCalculator.Edge e : edges) {
            String fromName = safeName(e.fromId());
            String toName = safeName(e.toId());
            result.add(new DtoModels.PairwiseBalance(
                    e.fromId(), fromName, e.toId(), toName, e.amount(), fromName,
                    "Simplified net balance"));
        }
        return result;
    }

    private String safeName(Long id) {
        try {
            return userService.get(id).name();
        } catch (Exception ex) {
            return String.valueOf(id);
        }
    }

    private static List<SettlementCalculator.DebtRow> toDebtRows(List<Share> shares) {
        List<SettlementCalculator.DebtRow> rows = new ArrayList<>();
        for (Share s : shares) {
            rows.add(new SettlementCalculator.DebtRow(
                    s.getUser().getId(), s.getSubEvent().getPayer().getId(), s.getAmount()));
        }
        return rows;
    }

    private static List<SettlementCalculator.SettlementRow> toSettlementRows(List<Settlement> settlements) {
        List<SettlementCalculator.SettlementRow> rows = new ArrayList<>();
        for (Settlement st : settlements) {
            rows.add(new SettlementCalculator.SettlementRow(
                    st.getFromUser().getId(), st.getToUser().getId(), st.getAmount()));
        }
        return rows;
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
