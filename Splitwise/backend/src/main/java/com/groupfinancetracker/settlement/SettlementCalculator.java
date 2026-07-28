package com.groupfinancetracker.settlement;

import java.math.BigDecimal;
import java.util.*;

/** Pure balance math — no Spring, no JPA. Unit-testable without a database. */
public final class SettlementCalculator {
    private SettlementCalculator() {}

    public static final BigDecimal EPSILON = new BigDecimal("0.005");

    public record DebtRow(Long debtorId, Long payerId, BigDecimal amount) {}
    public record SettlementRow(Long fromUserId, Long toUserId, BigDecimal amount) {}
    public record Edge(Long fromId, Long toId, BigDecimal amount) {}

    /** net &gt; 0 ⇒ owed money (creditor); net &lt; 0 ⇒ owes (debtor). */
    public static Map<Long, BigDecimal> netBalances(List<DebtRow> debts, List<SettlementRow> settlements) {
        Map<Long, BigDecimal> net = new HashMap<>();
        for (DebtRow d : debts) {
            if (Objects.equals(d.debtorId(), d.payerId())) continue; // self-share contributes nothing
            net.merge(d.payerId(), d.amount(), BigDecimal::add);
            net.merge(d.debtorId(), d.amount().negate(), BigDecimal::add);
        }
        for (SettlementRow s : settlements) {
            net.merge(s.fromUserId(), s.amount(), BigDecimal::add);        // paid ⇒ discharges own debt
            net.merge(s.toUserId(), s.amount().negate(), BigDecimal::add); // received ⇒ reduces credit
        }
        return net;
    }

    /** Greedy min-cash-flow: repeatedly match the largest debtor to the largest creditor. */
    public static List<Edge> simplify(Map<Long, BigDecimal> net) {
        List<Node> debtors = new ArrayList<>();
        List<Node> creditors = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> e : net.entrySet()) {
            if (e.getValue().compareTo(EPSILON.negate()) < 0) debtors.add(new Node(e.getKey(), e.getValue()));
            else if (e.getValue().compareTo(EPSILON) > 0) creditors.add(new Node(e.getKey(), e.getValue()));
        }
        List<Edge> result = new ArrayList<>();
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            debtors.sort(Comparator.comparing(n -> n.balance));                 // most negative first
            creditors.sort((a, b) -> b.balance.compareTo(a.balance));           // most positive first
            Node debtor = debtors.get(0);
            Node creditor = creditors.get(0);
            BigDecimal amount = debtor.balance.negate().min(creditor.balance);
            debtor.balance = debtor.balance.add(amount);
            creditor.balance = creditor.balance.subtract(amount);
            if (amount.compareTo(EPSILON) > 0) {
                result.add(new Edge(debtor.id, creditor.id, amount));
            }
            if (debtor.balance.abs().compareTo(EPSILON) < 0) debtors.remove(0);
            if (creditor.balance.abs().compareTo(EPSILON) < 0) creditors.remove(0);
        }
        result.sort(Comparator.comparing((Edge e) -> e.fromId()).thenComparing(Edge::toId));
        return result;
    }

    private static final class Node {
        final Long id;
        BigDecimal balance;
        Node(Long id, BigDecimal balance) { this.id = id; this.balance = balance; }
    }

    /**
     * Net balance between every pair of users, considering only debts/settlements directly
     * between the two of them -- unlike {@link #simplify}, this does not redirect a debt
     * through a third party. Useful for showing "here's what this simplified payment is
     * actually made of" when a net edge is the product of a circular/indirect debt chain
     * (e.g. A owes B, B owes C, C owes A collapsing into a single payment).
     */
    public static List<Edge> rawPairwise(List<DebtRow> debts, List<SettlementRow> settlements) {
        Map<Long, Map<Long, BigDecimal>> owed = new HashMap<>(); // owed[creditor][debtor] = amount debtor owes creditor
        for (DebtRow d : debts) {
            if (Objects.equals(d.debtorId(), d.payerId())) continue;
            owed.computeIfAbsent(d.payerId(), k -> new HashMap<>())
                    .merge(d.debtorId(), d.amount(), BigDecimal::add);
        }
        for (SettlementRow s : settlements) {
            // fromUser paid toUser directly, discharging what fromUser owed toUser.
            owed.computeIfAbsent(s.toUserId(), k -> new HashMap<>())
                    .merge(s.fromUserId(), s.amount().negate(), BigDecimal::add);
        }
        Set<Long> ids = new TreeSet<>();
        owed.forEach((creditor, debtors) -> { ids.add(creditor); ids.addAll(debtors.keySet()); });
        List<Long> idList = new ArrayList<>(ids);
        List<Edge> result = new ArrayList<>();
        for (int i = 0; i < idList.size(); i++) {
            for (int j = i + 1; j < idList.size(); j++) {
                Long a = idList.get(i), b = idList.get(j);
                BigDecimal bOwesA = owed.getOrDefault(a, Map.of()).getOrDefault(b, BigDecimal.ZERO);
                BigDecimal aOwesB = owed.getOrDefault(b, Map.of()).getOrDefault(a, BigDecimal.ZERO);
                BigDecimal net = bOwesA.subtract(aOwesB); // positive => b owes a
                if (net.compareTo(EPSILON) > 0) result.add(new Edge(b, a, net));
                else if (net.negate().compareTo(EPSILON) > 0) result.add(new Edge(a, b, net.negate()));
            }
        }
        result.sort(Comparator.comparing((Edge e) -> e.fromId()).thenComparing(Edge::toId));
        return result;
    }
}
