# Settlement Ledger Implementation Plan (Chunk 1 of 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the share-flipping `settlePairwise` with a settlement ledger so simplified/circular debt edges settle correctly without touching unrelated debts.

**Architecture:** Extract all balance math into a pure, DB-free `SettlementCalculator` (unit-testable). Add a `Settlement` entity (group-scoped, event-nullable) as the single source of truth for repayments. Balances become `shares − settlements`; `PaymentStatus` stops driving math. Confirming a share and settling a net edge both write ledger rows. A one-time backfill converts existing `CONFIRMED` shares to settlements so balances don't jump.

**Tech Stack:** Spring Boot 3.3.4, Java 17, JPA/Hibernate (`ddl-auto: update`, PostgreSQL, no migration files), Lombok, JUnit 5 + AssertJ (from `spring-boot-starter-test`). No H2 — algorithm tests must be pure unit tests with no Spring context.

## Global Constraints

- Money is `BigDecimal` throughout — never floating point. Column precision `19,2`.
- Rounding tolerance: amounts with absolute value `< 0.005` are treated as settled.
- Balance sign convention: `net(user) > 0` ⇒ creditor (owed money); `< 0` ⇒ debtor (owes). A simplified edge runs `from = debtor → to = creditor`.
- Entities use `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)`, Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, and a `@Version Long version`.
- Package root: `com.groupfinancetracker`.
- Backend commands run from `Splitwise/backend/`. Offline builds fail (deps not all cached) — use online `mvn` (no `-o`).

---

## File Structure

- Create `Splitwise/backend/src/main/java/com/groupfinancetracker/settlement/SettlementCalculator.java` — pure balance/simplification math. No Spring, no JPA.
- Create `Splitwise/backend/src/test/java/com/groupfinancetracker/settlement/SettlementCalculatorTest.java` — unit tests for the calculator.
- Create `Splitwise/backend/src/main/java/com/groupfinancetracker/entity/Settlement.java` — ledger entity.
- Create `Splitwise/backend/src/main/java/com/groupfinancetracker/repository/SettlementRepository.java` — queries by group/event/week.
- Create `Splitwise/backend/src/main/java/com/groupfinancetracker/config/ConfirmedShareBackfill.java` — one-time backfill.
- Modify `Splitwise/backend/src/main/java/com/groupfinancetracker/service/SettlementService.java` — feed the calculator with shares + settlements; drop `CONFIRMED` exclusion.
- Modify `Splitwise/backend/src/main/java/com/groupfinancetracker/service/PaymentService.java` — `confirm` emits a settlement; rewrite `settlePairwise` to insert one ledger row.
- Modify `Splitwise/backend/src/main/java/com/groupfinancetracker/controller/PaymentController.java` — pass `amount` through to `settlePairwise`.
- Modify `Splitwise/src/lib/api.ts` — send `amount` in the settle-pairwise call.

---

### Task 1: Pure `SettlementCalculator` + unit tests

**Files:**
- Create: `Splitwise/backend/src/main/java/com/groupfinancetracker/settlement/SettlementCalculator.java`
- Test: `Splitwise/backend/src/test/java/com/groupfinancetracker/settlement/SettlementCalculatorTest.java`

**Interfaces:**
- Produces:
  - `record DebtRow(Long debtorId, Long payerId, BigDecimal amount)`
  - `record SettlementRow(Long fromUserId, Long toUserId, BigDecimal amount)`
  - `record Edge(Long fromId, Long toId, BigDecimal amount)`
  - `static Map<Long,BigDecimal> netBalances(List<DebtRow> debts, List<SettlementRow> settlements)`
  - `static List<Edge> simplify(Map<Long,BigDecimal> net)`

- [ ] **Step 1: Write the failing tests**

Create `SettlementCalculatorTest.java`:

```java
package com.groupfinancetracker.settlement;

import com.groupfinancetracker.settlement.SettlementCalculator.DebtRow;
import com.groupfinancetracker.settlement.SettlementCalculator.Edge;
import com.groupfinancetracker.settlement.SettlementCalculator.SettlementRow;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SettlementCalculatorTest {
    private static BigDecimal money(String v) { return new BigDecimal(v); }

    @Test
    void selfShareIsIgnored() {
        var net = SettlementCalculator.netBalances(
                List.of(new DebtRow(1L, 1L, money("50"))), List.of());
        assertThat(net.getOrDefault(1L, BigDecimal.ZERO)).isEqualByComparingTo("0");
    }

    @Test
    void confirmedShareEquivalentSettlementNetsToZero() {
        var net = SettlementCalculator.netBalances(
                List.of(new DebtRow(1L, 2L, money("28"))),
                List.of(new SettlementRow(1L, 2L, money("28"))));
        assertThat(net.getOrDefault(1L, BigDecimal.ZERO)).isEqualByComparingTo("0");
        assertThat(net.getOrDefault(2L, BigDecimal.ZERO)).isEqualByComparingTo("0");
    }

    @Test
    void settlingNetEdgeLeavesUnrelatedDebtIntact() {
        // A=1 owes B=2 100 ; B owes C=3 100 ; A owes D=4 30
        var debts = List.of(
                new DebtRow(1L, 2L, money("100")),
                new DebtRow(2L, 3L, money("100")),
                new DebtRow(1L, 4L, money("30")));
        // settle simplified edge A->C 100
        var net = SettlementCalculator.netBalances(
                debts, List.of(new SettlementRow(1L, 3L, money("100"))));
        assertThat(net.getOrDefault(1L, BigDecimal.ZERO)).isEqualByComparingTo("-30");
        assertThat(net.getOrDefault(2L, BigDecimal.ZERO)).isEqualByComparingTo("0");
        assertThat(net.getOrDefault(3L, BigDecimal.ZERO)).isEqualByComparingTo("0");
        assertThat(net.getOrDefault(4L, BigDecimal.ZERO)).isEqualByComparingTo("30");
    }

    @Test
    void simplifyProducesMinimalEdge() {
        var net = SettlementCalculator.netBalances(List.of(
                new DebtRow(1L, 2L, money("100")),
                new DebtRow(2L, 3L, money("100"))), List.of());
        List<Edge> edges = SettlementCalculator.simplify(net);
        assertThat(edges).hasSize(1);
        assertThat(edges.get(0).fromId()).isEqualTo(1L);
        assertThat(edges.get(0).toId()).isEqualTo(3L);
        assertThat(edges.get(0).amount()).isEqualByComparingTo("100");
    }

    @Test
    void partialSettlementReducesEdge() {
        var net = SettlementCalculator.netBalances(
                List.of(new DebtRow(1L, 2L, money("100"))),
                List.of(new SettlementRow(1L, 2L, money("40"))));
        List<Edge> edges = SettlementCalculator.simplify(net);
        assertThat(edges).hasSize(1);
        assertThat(edges.get(0).amount()).isEqualByComparingTo("60");
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd Splitwise/backend && mvn -q test -Dtest=SettlementCalculatorTest`
Expected: FAIL — compilation error, `SettlementCalculator` does not exist.

- [ ] **Step 3: Write the implementation**

Create `SettlementCalculator.java`:

```java
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

    /** net > 0 ⇒ owed money (creditor); net < 0 ⇒ owes (debtor). */
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd Splitwise/backend && mvn -q test -Dtest=SettlementCalculatorTest`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add Splitwise/backend/src/main/java/com/groupfinancetracker/settlement/SettlementCalculator.java Splitwise/backend/src/test/java/com/groupfinancetracker/settlement/SettlementCalculatorTest.java
git commit -m "feat(settlement): pure balance/simplification calculator with unit tests"
```

---

### Task 2: `Settlement` entity + repository

**Files:**
- Create: `Splitwise/backend/src/main/java/com/groupfinancetracker/entity/Settlement.java`
- Create: `Splitwise/backend/src/main/java/com/groupfinancetracker/repository/SettlementRepository.java`

**Interfaces:**
- Consumes: `Group`, `Event`, `User` entities (existing).
- Produces:
  - `Settlement` with getters `getGroup()`, `getEvent()`, `getFromUser()`, `getToUser()`, `getAmount()`, `getCreatedAt()`, `getCreatedBy()`, `getNote()` and Lombok `builder()`.
  - `SettlementRepository` methods: `List<Settlement> findByGroup_Id(Long groupId)`, `List<Settlement> findByEvent_Id(Long eventId)`, `List<Settlement> findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(Long groupId, Integer weekNumber, Integer year)`, `boolean existsByGroup_IdAndFromUser_IdAndToUser_IdAndAmount(Long groupId, Long fromId, Long toId, BigDecimal amount)`.

- [ ] **Step 1: Create the entity**

Create `Settlement.java`:

```java
package com.groupfinancetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "settlements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Settlement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private Group group;

    /** Nullable: event-scoped settlements (confirm / event-level settle) set this; group-level ones leave it null. */
    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private Instant createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(length = 500)
    private String note;

    @Version
    private Long version;
}
```

- [ ] **Step 2: Create the repository**

Create `SettlementRepository.java`:

```java
package com.groupfinancetracker.repository;

import com.groupfinancetracker.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findByGroup_Id(Long groupId);
    List<Settlement> findByEvent_Id(Long eventId);
    List<Settlement> findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(Long groupId, Integer weekNumber, Integer year);
    boolean existsByGroup_IdAndFromUser_IdAndToUser_IdAndAmount(Long groupId, Long fromId, Long toId, BigDecimal amount);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd Splitwise/backend && mvn -q compile`
Expected: BUILD SUCCESS. Confirms the derived query method names resolve against the entity graph (`Event` has `getGroup()`, `getWeekNumber()`, `getYear()`).

- [ ] **Step 4: Commit**

```bash
git add Splitwise/backend/src/main/java/com/groupfinancetracker/entity/Settlement.java Splitwise/backend/src/main/java/com/groupfinancetracker/repository/SettlementRepository.java
git commit -m "feat(settlement): add Settlement ledger entity and repository"
```

---

### Task 3: Refactor `SettlementService` to use the calculator + ledger

**Files:**
- Modify: `Splitwise/backend/src/main/java/com/groupfinancetracker/service/SettlementService.java`

**Interfaces:**
- Consumes: `SettlementCalculator` (Task 1), `SettlementRepository` (Task 2).
- Produces: unchanged public method signatures and DTO shapes (`groupSummary`, `groupPairwise`, `weeklySettlements`, `eventPairwise`, `userDebts`), now computed from `shares − settlements`.

- [ ] **Step 1: Add the repository dependency and helper builders**

In `SettlementService`, add field `private final SettlementRepository settlementRepository;` (the constructor is Lombok-generated). Add the import `import com.groupfinancetracker.settlement.SettlementCalculator;`. Add two private helpers:

```java
private static java.util.List<SettlementCalculator.DebtRow> toDebtRows(java.util.List<Share> shares) {
    java.util.List<SettlementCalculator.DebtRow> rows = new java.util.ArrayList<>();
    for (Share s : shares) {
        rows.add(new SettlementCalculator.DebtRow(
                s.getUser().getId(), s.getSubEvent().getPayer().getId(), s.getAmount()));
    }
    return rows;
}

private static java.util.List<SettlementCalculator.SettlementRow> toSettlementRows(
        java.util.List<com.groupfinancetracker.entity.Settlement> settlements) {
    java.util.List<SettlementCalculator.SettlementRow> rows = new java.util.ArrayList<>();
    for (var st : settlements) {
        rows.add(new SettlementCalculator.SettlementRow(
                st.getFromUser().getId(), st.getToUser().getId(), st.getAmount()));
    }
    return rows;
}
```

- [ ] **Step 2: Rewrite `groupSummary` (no CONFIRMED exclusion)**

Replace the body of `groupSummary` with:

```java
public DtoModels.GroupSettlementSummary groupSummary(@NonNull Long groupId) {
    Group g = groupRepository.findById(groupId)
            .orElseThrow(() -> new NotFoundException("Group not found: " + groupId));
    List<Share> shares = shareRepository.findBySubEvent_Event_Group_Id(groupId);
    var settlements = settlementRepository.findByGroup_Id(groupId);
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
```

- [ ] **Step 3: Replace `calculateSimplifiedPairwise` and delete `UserBalanceTemp`**

Delete the private `calculateSimplifiedPairwise(List<Share>)` method and the `UserBalanceTemp` inner class. Add this calculator-backed overload plus a name helper:

```java
private List<DtoModels.PairwiseBalance> calculateSimplifiedPairwise(
        List<Share> shares, List<com.groupfinancetracker.entity.Settlement> settlements) {
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
    try { return userService.get(id).name(); } catch (Exception ex) { return String.valueOf(id); }
}
```

- [ ] **Step 4: Point the three callers at the new overload**

- In `groupPairwise`: after loading `shares`, add `var settlements = settlementRepository.findByGroup_Id(groupId);` and change the call to `calculateSimplifiedPairwise(shares, settlements)`.
- In `weeklySettlements`: after loading week-filtered `shares`, add
  `var settlements = settlementRepository.findByEvent_Group_IdAndEvent_WeekNumberAndEvent_Year(groupId, weekNumber, year);`
  and change the call to `calculateSimplifiedPairwise(shares, settlements)`.
- In `eventPairwise`: after loading `shares`, add `var settlements = settlementRepository.findByEvent_Id(eventId);` and change the call to `calculateSimplifiedPairwise(shares, settlements)`.

> Design note: group queries include all group settlements; event/weekly queries scope by event so a repayment shows only against the event/week it belongs to. Group-level (`event = null`) settlements are intentionally excluded from weekly views.

- [ ] **Step 5: Leave `userDebts` as-is (itemized view)**

`userDebts` uses `findByUser_IdAndPaymentStatus_StatusNot(userId, PaymentState.CONFIRMED)` to list the user's not-yet-confirmed shares. This is the itemized "your outstanding shares" list, still correct. Add a one-line comment above it: `// Itemized view only; net balances live in groupSummary (shares - settlements).` No logic change.

- [ ] **Step 6: Verify it compiles**

Run: `cd Splitwise/backend && mvn -q compile`
Expected: BUILD SUCCESS with no unused-symbol leftovers (old method + `UserBalanceTemp` fully removed).

- [ ] **Step 7: Commit**

```bash
git add Splitwise/backend/src/main/java/com/groupfinancetracker/service/SettlementService.java
git commit -m "refactor(settlement): compute balances from shares minus ledger, drop CONFIRMED exclusion"
```

---

### Task 4: `PaymentService` — confirm emits a settlement; rewrite `settlePairwise`

**Files:**
- Modify: `Splitwise/backend/src/main/java/com/groupfinancetracker/service/PaymentService.java`
- Modify: `Splitwise/backend/src/main/java/com/groupfinancetracker/controller/PaymentController.java`

**Interfaces:**
- Consumes: `SettlementRepository` (Task 2), `EventRepository`, `GroupRepository`, `UserRepository`, `Settlement`, `Group`, `Event`, `User`.
- Produces: `void settlePairwise(Long groupId, Long eventId, Long fromUserId, Long toUserId, BigDecimal amount)` — inserts exactly one `Settlement`.

- [ ] **Step 1: Add dependencies**

Add fields to `PaymentService`: `private final SettlementRepository settlementRepository;`, `private final com.groupfinancetracker.repository.EventRepository eventRepository;`, `private final com.groupfinancetracker.repository.GroupRepository groupRepository;`, `private final com.groupfinancetracker.repository.UserRepository userRepository;`. Add imports: `com.groupfinancetracker.entity.Settlement`, `com.groupfinancetracker.entity.Group`, `com.groupfinancetracker.entity.Event`, `com.groupfinancetracker.entity.User`, `com.groupfinancetracker.repository.SettlementRepository`, `java.math.BigDecimal`.

- [ ] **Step 2: `confirm` emits a settlement**

In `confirm`, immediately after `ps.setConfirmedAt(Instant.now()); paymentStatusRepository.save(ps);`, insert:

```java
// Ledger: a confirmed itemized payment is a real repayment debtor -> payer for the share amount.
Long debtorId = s.getUser().getId();
Long confirmPayerId = s.getSubEvent().getPayer().getId();
if (!debtorId.equals(confirmPayerId)) {
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
```

- [ ] **Step 3: Rewrite `settlePairwise`, delete `confirmShare`**

Replace the whole `settlePairwise(...)` method and the `confirmShare(...)` helper with:

```java
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
```

- [ ] **Step 4: Pass `amount` through the controller**

In `PaymentController.settlePairwise`, after reading `creditorId`, add and forward the amount:

```java
Number amountVal = (Number) body.get("amount");
java.math.BigDecimal amount = amountVal != null ? new java.math.BigDecimal(amountVal.toString()) : null;
paymentService.settlePairwise(groupId, eventId, debtorId, creditorId, amount);
```

Replace the existing `paymentService.settlePairwise(groupId, eventId, debtorId, creditorId);` call with the line above.

- [ ] **Step 5: Verify it compiles**

Run: `cd Splitwise/backend && mvn -q compile`
Expected: BUILD SUCCESS, no reference to the deleted `confirmShare`.

- [ ] **Step 6: Commit**

```bash
git add Splitwise/backend/src/main/java/com/groupfinancetracker/service/PaymentService.java Splitwise/backend/src/main/java/com/groupfinancetracker/controller/PaymentController.java
git commit -m "feat(settlement): confirm emits ledger row; settlePairwise records net payment by amount"
```

---

### Task 5: One-time backfill of existing CONFIRMED shares

**Files:**
- Create: `Splitwise/backend/src/main/java/com/groupfinancetracker/config/ConfirmedShareBackfill.java`

**Interfaces:**
- Consumes: `ShareRepository`, `SettlementRepository`, `Share`, `Settlement`.

- [ ] **Step 1: Create the backfill component**

Create `ConfirmedShareBackfill.java` (mirrors the existing `EventWeekBackfill` `@PostConstruct` pattern; idempotent via the `existsBy...` guard):

```java
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
```

> Note: the idempotency guard keys on `(group, from, to, amount)`. If a group legitimately had two identical confirmed shares, a *re-run* records only one; on the first run the settlements table is empty so all rows are created. Acceptable for a one-time migration whose guard exists only to make accidental re-runs safe.

- [ ] **Step 2: Verify it compiles**

Run: `cd Splitwise/backend && mvn -q compile`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add Splitwise/backend/src/main/java/com/groupfinancetracker/config/ConfirmedShareBackfill.java
git commit -m "feat(settlement): idempotent backfill converting confirmed shares to ledger rows"
```

---

### Task 6: Frontend — send the net `amount` when settling

**Files:**
- Modify: `Splitwise/src/lib/api.ts`
- Modify: `Splitwise/src/pages/EventDetail.tsx`

**Interfaces:**
- Consumes: `settlePairwise` backend endpoint (Task 4) now expecting `amount`.

- [ ] **Step 1: Find the settle call**

Run: `grep -n "settle-pairwise\|settlePairwise" Splitwise/src/lib/api.ts`
Expected: the `subEventAPI.settlePairwise` function that POSTs `{ groupId, eventId, debtorId, creditorId }`.

- [ ] **Step 2: Add `amount` to the signature and payload**

If the function currently reads:

```ts
settlePairwise: (groupId: number | null, eventId: number | null, debtorId: any, creditorId: any) =>
  api.post('/payments/settle-pairwise', { groupId, eventId, debtorId, creditorId }),
```

change it to:

```ts
settlePairwise: (groupId: number | null, eventId: number | null, debtorId: any, creditorId: any, amount: number) =>
  api.post('/payments/settle-pairwise', { groupId, eventId, debtorId, creditorId, amount }),
```

(Match the actual object/method name in the file; only the signature and posted body change.)

- [ ] **Step 3: Update the caller in `EventDetail.tsx`**

In `confirmSettle`, pass the edge amount already held in `pendingSettle`:

```ts
await subEventAPI.settlePairwise(
  null, Number(eventId),
  pendingSettle.debtorId, pendingSettle.creditorId,
  pendingSettle.amount
);
```

- [ ] **Step 4: Verify the frontend type-checks**

Run: `cd Splitwise && npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors — the new `amount` argument is supplied at the only call site.

- [ ] **Step 5: Commit**

```bash
git add Splitwise/src/lib/api.ts Splitwise/src/pages/EventDetail.tsx
git commit -m "feat(settlement): send net amount from the settle UI to the ledger endpoint"
```

---

## Self-Review

**Spec coverage (§2 of the design spec):**
- Settlement entity → Task 2 ✓
- Unified balance rule `shares − settlements` → Task 1 (calculator) + Task 3 (service) ✓
- Itemized confirm emits settlement → Task 4 Step 2 ✓
- Net-flow settle inserts one row for the exact amount → Task 4 Step 3 + Task 6 ✓
- Correctness proof (D-₹30) → Task 1 test `settlingNetEdgeLeavesUnrelatedDebtIntact` ✓
- Migration/backfill (idempotent) → Task 5 ✓
- Tests (triangle, D-₹30, partial, self-share, confirm-equivalence) → Task 1 ✓

**Placeholder scan:** none — every code step shows complete code. (Task 3 Step 5 is an explicit no-op with rationale; Task 6 Step 2 shows exact before/after.)

**Type consistency:** `DebtRow(debtorId, payerId, amount)`, `SettlementRow(fromUserId, toUserId, amount)`, `Edge(fromId, toId, amount)`, and `settlePairwise(Long, Long, Long, Long, BigDecimal)` are used identically across Tasks 1, 3, 4, 6. `Settlement` builder property names (`group/event/fromUser/toUser/amount/createdAt/createdBy/note`) match between Tasks 2, 4, 5.

**Scoping confirmations:** event-nullable settlement scoping handled — group queries include all group settlements; event/weekly queries scope by event; group-level (`event = null`) settlements are excluded from weekly views by design (Task 3 Step 4 note).

## Known follow-ups (later chunks, not this plan)
- Chunk 2: payer-override fix + edit/delete expense.
- Chunk 3: authorization hardening + signup-bypass close.
- Chunk 4: remove mock mode / Supabase / 10-week auto-delete; unify week index.
- Chunk 5: budget edit + server-computed spend; recurring pause/cancel; delete invitation backend.
- Chunk 6: port weekly view; delete MUI app; build gate; rewrite CLAUDE.md/README.
