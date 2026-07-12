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
}
