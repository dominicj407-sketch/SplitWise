# SplitWise Consolidation & Correctness — Design Spec

**Date:** 2026-07-04
**Status:** Approved (design), pending implementation plan
**Scope:** Collapse the two frontends into one working web app, fix all correctness/security flaws found in the audit, implement every partial feature except notifications, and remove dead/unnecessary code.

---

## 1. Background

The repo currently contains **two** React frontends against one Spring Boot backend:

- `Splitwise/src/` — Tailwind app (generated via bolt.new). Richer: auth (login/signup/Google/forgot-password), profile + UPI, settlement center, UPI QR + payment proof, recurring display, budget banner. Contains a hardcoded mock-mode backdoor and an unused Supabase dependency.
- `Splitwise/frontend/` — MUI app. Type-checked and cleaner but functionally thin: no settle-pairwise, no UPI, no proof, no recurring, no forgot-password/Google/profile. Has the weekly-"pages" settlement screen the Tailwind app lacks.

Verified build signals at audit time: backend `mvn compile` ✓, Tailwind `vite build` ✓ (no typecheck in its build script), MUI `tsc -b && vite build` ✓. Zero automated tests exist anywhere.

### Approved decisions
- **Canonical frontend:** keep `Splitwise/src/` (Tailwind); port the MUI weekly view into it; then delete `Splitwise/frontend/`.
- **Budget:** warn-only (no hard block), with an editable limit and server-computed spend.
- **History:** drop the destructive 10-week auto-delete; retain all history; keep weekly grouping for display.
- **Invitations:** delete the unused invitation backend; keep the group-code request/approve flow.
- **Account deletion:** self-only.
- **Out of scope:** notifications/email alerts (beyond existing signup + forgot-password mail); any new product features; unrelated refactors.

---

## 2. Core change: settlement ledger

### Problem
`PaymentService.settlePairwise` clears a simplified/net debt edge by flipping **whole shares** to `CONFIRMED`. For an indirect (circular) edge it confirms *every* share where the debtor owes anyone and *every* share where the creditor is owed by anyone. This silently settles unrelated debts, and because it confirms whole shares it ignores the net edge amount entirely (no partial settlement, no record of who paid whom).

### Solution: a settlement ledger as the single source of truth for balances

**New entity `Settlement`:**

| field | type | notes |
|---|---|---|
| id | Long | PK |
| group | Group (FK) | scope |
| fromUser | User (FK) | who paid |
| toUser | User (FK) | who received |
| amount | BigDecimal | exact amount recorded |
| createdAt | Instant | |
| createdBy | User (FK) | actor who recorded it |
| note | String (nullable) | optional |

**Unified balance rule (replaces all `PaymentStatus`-based balance math):**

```
net(user) = Σ(share.amount where user == subEvent.payer)     // owed to them
          − Σ(share.amount where user == share.debtor)         // they owe
          + Σ(settlement.amount where user == fromUser)        // discharged debt
          − Σ(settlement.amount where user == toUser)          // repaid
```

Balances no longer depend on `PaymentStatus`. Both settlement paths write ledger rows:

- **Itemized flow** — debtor marks their exact share paid → payer confirms. Confirming now **inserts a `Settlement(from=debtor, to=payer, amount=share.amount)`** and sets `PaymentStatus=CONFIRMED` purely for display/proof (`transactionRef`, `proofUrl`, marked/confirmed timestamps). Because balance = shares − settlements, the confirmed share and its settlement cancel exactly — no double counting.
- **Net flow** — the Settlement Center edge (e.g. `A → C ₹100`) inserts **one** `Settlement` for exactly the edge amount. No shares are touched.

### Correctness proof (the audited bug)
Given: `B paid, A owes B ₹100`; `C paid, B owes C ₹100`; `D paid, A owes D ₹30`.
Simplification yields edges `A → C ₹100` and `A → D ₹30`. User settles `A → C ₹100` → one `Settlement(A→C, 100)`.

```
rawNet:  A = −130,  B = 0,  C = +100,  D = +30
+settle: A += 100 → A = −30,  C −= 100 → C = 0
final:   A = −30 (still owes D 30),  B = 0,  C = 0,  D = +30   ✓
```
A's unrelated ₹30 debt to D is preserved. The simple triangle still nets to zero. Circular chains resolve correctly because a net edge is recorded as a net payment rather than by guessing which shares to flip.

### Affected code
- `SettlementService.groupSummary`, `calculateSimplifiedPairwise`, `userDebts`, `weeklySettlements`, `eventPairwise` — compute from shares − settlements.
- `PaymentService.confirm` — emit a settlement on confirm.
- `PaymentService.settlePairwise(groupId|eventId, fromUserId, toUserId, amount)` — insert one settlement; delete the old share-flipping/circular branch. Signature gains an explicit `amount` (the net edge amount from the UI).
- New `SettlementRepository`; sum queries by group/user.

### Migration
One-time backfill (mirroring `EventWeekBackfill`): for every currently-`CONFIRMED` share with no corresponding settlement, insert `Settlement(from=debtor, to=payer, amount=share.amount)` so balances don't jump on deploy.

### Tests (new)
JUnit tests for the settlement algorithm covering: simple triangle nets to zero; the D-₹30 over-settlement scenario; partial settlement (edge amount < gross); a share whose user is the payer (self-share) contributes zero; confirm-emits-settlement equivalence.

---

## 3. Correctness bugs

1. **Payer override** — `SubEventController.create` currently overwrites `payerId` with the JWT actor, so any selected payer is discarded ("Bob paid" saved as "you paid"). Fix: honor `req.payerId()`, validated as a member of the event's group. JWT actor is used only for authorization (must be a group member).
2. **Edit / delete expense** — no update/delete exists. Add `PUT /api/subevents/{id}` (re-validate shares sum to total ±0.01; adjust shares/payment-statuses) and `DELETE /api/subevents/{id}` (remove shares + statuses; recompute balances). Authorization: event creator or the expense's payer. UI: edit + delete controls per expense.
3. **Week-index inconsistency** — `EventService` aligns the base date to the preceding Sunday; `SubEventService` does not. Unify into one shared helper used by both.
4. **Remove 10-week auto-delete** — `EventService.create` stops deleting the oldest week; remove `deleteWeek` invocation and the `new-event-warning` block + its frontend usage. Retain all history; keep weekly grouping (`listWeeks` returns all weeks).

---

## 4. Authorization hardening

- Derive actor from the JWT everywhere; add a small helper for `currentUserId()`. Check group membership/ownership on every group-scoped read and mutation.
- `GET /api/reports/weekly` — ignore any client `userId`; use the authenticated user.
- `GET /api/users/{id}/shares` — self-only.
- Remove "list all users": add group-scoped `GET /api/groups/{id}/members` returning member `id/name/upiId`; replace the frontend's `userAPI.getAll()` usage. User **search** (for inviting) stays but returns minimal fields.
- `DELETE /api/users/{id}` — self-only.
- Close the public signup bypass: remove public `POST /api/users`; signup only via `/auth/signup` (issues master password). Update `SecurityConfig`.
- Remove `System.out.println` debug lines in `GroupController`; `JwtAuthFilter` logs verification failures at debug instead of swallowing silently.
- Externalize DB/mail credentials to env with non-secret local defaults; add `.env.example`; drop the real-looking committed values. The Google OAuth **client ID** is public by design and stays.

---

## 5. Feature completion

- **Budget (warn-only):** `PUT /api/groups/{id}` sets name + `budgetLimit` (creator only). Group summary returns server-computed `spent`. Banner drops the false "all members notified" line.
- **Recurring expenses:** add pause/cancel (`PUT /api/subevents/{id}/recurring` toggling `isRecurring`/clearing `nextRunDate`); recompute the clone's week index in `RecurringExpenseScheduler`; surface pause/cancel in the UI.
- **Invitations:** delete the invitation entity/service/controller endpoints and repository; keep the group-code flow.
- **Weekly view:** port the MUI `WeeklySettlementsPage` into a Tailwind screen with group→week navigation.
- **Frontend build gate:** change the `src` build script to `tsc && vite build` so type errors fail the build.

---

## 6. Cleanup / consolidation

- Delete the mock-mode (`isMockMode()`) branches throughout `src/lib/api.ts`.
- Remove the unused `@supabase/supabase-js` dependency.
- Delete `Splitwise/frontend/` (MUI app) after porting the weekly view.
- Rewrite `CLAUDE.md` to describe the surviving single app; delete or correct the stale `README.md`/`SETUP.md`.

---

## 7. Implementation order (reviewable chunks)

1. Settlement ledger + balance rewrite + migration + tests. *(core)*
2. Payer fix + edit/delete expense.
3. Authorization hardening + close signup bypass.
4. Remove mock mode, Supabase, 10-week auto-delete; unify week index.
5. Budget edit + server-computed spend; recurring pause/cancel; delete invitation backend.
6. Port weekly view; delete MUI app; add build gate; rewrite CLAUDE.md/README.

---

## 8. Risks & notes

- **Double-counting guard:** balances derive purely from shares − settlements; `PaymentStatus` must not also subtract. Any code still reading `CONFIRMED` for math is a bug — audit all five settlement methods during chunk 1.
- **Backfill correctness:** the migration must be idempotent (skip shares that already have a settlement) so re-runs don't double-credit.
- **Schema ownership:** Hibernate `ddl-auto: update` owns the schema (no migration files); the `Settlement` table is created automatically and populated by the backfill component.
- **Deleting an expense** removes its shares but leaves prior settlements intact; balances recompute from what remains, which is correct.
