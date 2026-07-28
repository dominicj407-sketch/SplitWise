# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

All source lives under the `Splitwise/` subdirectory (the git root is one level above it):

- `Splitwise/backend/` — Spring Boot 3.3.4 / Java 17 REST API (Maven, package `com.groupfinancetracker`)
- `Splitwise/src/` — **the** React 18 + TypeScript + Vite SPA (Tailwind CSS), the single canonical frontend. Entry `Splitwise/index.html` → `Splitwise/src/main.tsx`.

> **There used to be a second, competing frontend at `Splitwise/frontend/` (an MUI app).** The Tailwind app in `Splitwise/src/` is now the single app. If `Splitwise/frontend/` is still present, it is **deprecated dead weight and should be deleted** (`git rm -r Splitwise/frontend`); nothing depends on it.

Note the naming mismatch: the repo is "SplitWise" but the backend artifact is `GroupFinanceTracker` and the frontend package is `vite-react-typescript-starter`. Same app.

> The `README.md`/`SETUP.md` under `Splitwise/` are stale. Trust the source. `DATA_HIERARCHY.md` is still accurate about the domain model.

## Commands

### Backend (from `Splitwise/backend/`)
No Maven wrapper — use a system `mvn`. **There is no local PostgreSQL option** — the app connects only to a Supabase-hosted Postgres instance (see Configuration below); `Splitwise/backend/.env` (gitignored) must exist with valid `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` before `spring-boot:run` will start.

```bash
mvn spring-boot:run      # API on http://localhost:8080 (Swagger at /swagger-ui.html)
mvn clean package        # build the jar
mvn test                 # runs the SettlementCalculator unit tests
```

Offline builds may fail if the local Maven repo is cold; a first online build populates it, after which `mvn -o` works.

Startup occasionally fails on the first attempt with a transient `This connection has been closed` / `Connection reset` error while Hibernate scans schema metadata through Supabase's pooler — this is pooler flakiness, not a code bug; just re-run `mvn spring-boot:run`.

### Frontend (from `Splitwise/`)
```bash
npm install
npm run dev              # Vite dev server (port 3000 per --port, else vite.config)
npm run build            # tsc --noEmit && vite build  (type errors now FAIL the build)
npm run typecheck        # tsc --noEmit -p tsconfig.app.json
npm run lint             # eslint
```

## Configuration

Backend config lives in `Splitwise/backend/src/main/resources/application.yml` (base) and `application-postgres.yml` (active profile `postgres`, always on). The datasource block lives entirely in `application-postgres.yml` as `${DB_URL}` / `${DB_USERNAME}` / `${DB_PASSWORD}` with **no committed defaults and no local-Postgres fallback** — these must come from the environment.

- **`Splitwise/backend/.env`** (gitignored, never committed) is the actual source of these three values. The `me.paulschwarz:spring-dotenv` dependency (in `pom.xml`) loads it automatically — no manual `export` needed, just `mvn spring-boot:run`.
- The DB is a **Supabase-hosted Postgres**, and `DB_URL` must point at the **transaction-mode pooler on port `6543`** (not `5432`) with `?prepareThreshold=0` appended (disables client-side prepared-statement caching, required for Supavisor's transaction pooling). Example: `jdbc:postgresql://<project>.pooler.supabase.com:6543/postgres?prepareThreshold=0`.
  - Port `5432` is Supabase's *session*-mode pooler, hard-capped at a small `pool_size` (e.g. 15) shared across every connection to the project — normal dev restarts exhaust it fast and startup fails with `FATAL: max clients reached in session mode`. Don't use it.
- HikariCP is tuned in `application-postgres.yml` for the pooler's behavior: small pool (`maximum-pool-size: 5`), non-fatal init (`initialization-fail-timeout: -1`), and a `max-lifetime`/`idle-timeout` shorter than the pooler's own connection recycling so Hikari retires connections gracefully instead of handing out ones the pooler already closed.
- `MAIL_USER`, `MAIL_PASS`, `GOOGLE_CLIENT_ID` still have committed defaults directly in `application.yml` — externalizing/rotating those remains an outstanding hardening item (unlike the DB credentials, which are now fully externalized).

Hibernate owns the schema (`ddl-auto: update`); no migration files. Frontend API base URL is hard-coded to `http://localhost:8080/api` in `src/lib/api.ts`. CORS allows origins 3000, 9000, 5173.

## Core domain model

Four-level hierarchy:

```
Group ──< Event ──< SubEvent ──< Share ──1:1── PaymentStatus
(people) (a bucket) (one expense) (one debtor's  (workflow/proof state)
                                    portion)
```

Plus a **`Settlement` ledger** (see below), which is the source of truth for balances.

- **SubEvent** = a single expense: a `payer`, a `totalAmount`, and a list of `Share`s. The selected `payerId` is **honored** (you can record an expense someone else paid); the payer must be a group member. Expenses can be **edited (`PUT /api/subevents/{id}`)** and **deleted (`DELETE`)** by the event creator or the payer. Recurring expenses can be stopped (`PUT /api/subevents/{id}/recurring/stop`). A SubEvent's `subEventDate` must fall within its parent Event's `startDate`/`endDate`; `EventService.create` defaults an omitted range to **±10 years from today** (open-ended in practice) rather than just the creation day, so logging an expense for a different date than "today" doesn't get rejected.
- **Share** = how much one user owes the payer. `SubEventService` persists exactly the shares passed; they must sum to `totalAmount` (±0.01). A debtor share starts `UNPAID`; a share whose user *is* the payer starts `CONFIRMED`.
- **PaymentStatus** = per-share workflow/proof state `UNPAID → MARKED_AS_PAID → CONFIRMED`. **It no longer drives balance math** — it records who marked paid, `transactionRef`, `proofUrl`, timestamps.

### Settlement ledger (the heart of the app)
Balances are computed as **shares − settlements**, in a pure, DB-free `settlement.SettlementCalculator` (unit-tested in `SettlementCalculatorTest`):

```
net(user) = Σ(shares where user is payer) − Σ(shares where user is debtor)
          + Σ(settlements where user paid) − Σ(settlements where user received)
```

- `SettlementCalculator.simplify(net)` runs the greedy min-cash-flow to produce a minimal set of "who pays whom" edges. Amounts under `0.005` are treated as settled.
- `SettlementCalculator.rawPairwise(debts, settlements)` computes the *unsimplified* direct net between every pair of users (no third-party redirection) — used to show what a simplified/circular edge actually collapsed from (e.g. A→B→C→A becoming a single payment). Exposed as `rawPairwiseBalances` alongside `pairwiseBalances` on `GroupPairwise`, `WeeklySettlementResponse`, and `EventSettlementResponse`.
- **Confirming** a share (`PaymentService.confirm`, only the payer) writes a `Settlement(debtor→payer, share amount)` linked to the sub-event.
- **Settling a simplified/net edge** (`PaymentService.settlePairwise`, `POST /api/payments/settle-pairwise`) writes **one** `Settlement` for exactly the edge amount. The actor must be a group member and one of the two parties. This is the correct fix for circular/indirect debts — it never touches unrelated debts (the old share-flipping approach did). `eventId` is optional: pass it to scope a `Settlement` to one event, or omit it (as the group-level "Settle Up" UI does) to scope to the group only, leaving `event` `null` on the row.
- **Event/week-scoped settlement views always net against *all* settlements in the group**, not just ones tagged to that specific event/week (`SettlementService.eventPairwise`/`weeklySettlements`). A group-scoped `Settlement` has no `event_id`, so filtering settlements by event previously made group-level "Settle Up" invisible on the Event page forever (looked like a UI refresh bug; it was a backend query scoping bug). Debt *shares* still stay scoped to the event/week — only the settlements side of the netting is group-wide.
- `ConfirmedShareBackfill` (`@PostConstruct`, idempotent) converts pre-existing `CONFIRMED` shares to settlements so balances don't jump.
- Currency is Indian Rupees (₹); money is `BigDecimal` throughout — never floating point.

### Weekly organization ("pages")
Events/SubEvents carry a `weekNumber` = weeks elapsed since the earliest expense date (1-based), `year` hard-coded to `1`. `EventService` and `SubEventService` share one `computeWeekIndex` helper (no Sunday alignment). **All history is retained** — the old "keep only 10 weeks / auto-delete oldest page" behavior has been removed; `newEventWarning` is now a no-op kept for API compatibility.

### Recurring expenses
`RecurringExpenseScheduler` (`@Scheduled`, hourly) clones due recurring SubEvents for the new period and advances `nextRunDate`.

## Backend structure & conventions

Layered Spring Boot: `controller/` → `service/` (`@Transactional`, Lombok `@RequiredArgsConstructor`) → `repository/` → `entity/`.

- **All DTOs are Java records nested in `dto/DtoModels.java`** (`DtoModels.XxxRequest`/`XxxResponse`).
- Auth is stateless JWT: `JwtService` issues, `JwtAuthFilter` validates (sets the user id as the auth `details`), `SecurityConfig` permits `/api/auth/**` and swagger; everything else requires auth. Passwords BCrypt. **Signup is only via `/api/auth/signup`** (issues a master password by email); the old public `POST /api/users` bypass is closed.
- **Authorization**: the actor is read from the JWT (`SecurityContextHolder…getDetails()`), not trusted from the request body, for sensitive ops. Self-only: `DELETE`/`PUT /api/users/{id}`, `GET /api/users/{id}/shares`, `GET /api/reports/weekly`. Group-membership gated: share reads, settlement writes, group spend. Known remaining gaps: `GET /api/users` still lists all users, and some group-scoped reads (`GET /api/groups/{id}`, events, group settlements) are not yet membership-gated.
- Exceptions: throw `NotFoundException` (404) / `ForbiddenActionException` (403) / `IllegalArgumentException` (400) / `IllegalStateException` (409); `GlobalExceptionHandler` maps all of them plus validation errors. Anything else falls through to a generic, **unlogged** 500 — if a request 500s with no matching server log line, that's why; the real reason is only in the response body's `message`.

## Frontend structure & conventions (`Splitwise/src/`)

- **API layer**: never call `axios` directly — use the typed objects in `src/lib/api.ts` (`authAPI`, `groupAPI`, `eventAPI`, `subEventAPI`, `userAPI`, …). The shared axios instance injects the Bearer token and clears storage on 401. Mock mode has been removed.
- **Auth/state**: `AuthContext` (`src/contexts/AuthContext.tsx`) holds the user in `localStorage` (`user`), JWT in `token`. `ProtectedRoute` guards pages. Google OAuth + forgot-password (master password) supported.
- **Theming**: Tailwind, light/dark via `ThemeContext`. Types in `src/types.ts`.

## Design/plan docs
The consolidation effort is specced in `docs/superpowers/specs/2026-07-04-splitwise-consolidation-design.md` and `docs/superpowers/plans/2026-07-04-settlement-ledger.md`.

## Known follow-ups (not yet done)
- Delete the deprecated `Splitwise/frontend/` (MUI) app.
- Port a per-week settlement view into the Tailwind app (the MUI app had one).
- Remove the unused invitation backend (`GroupInvitation` entity/repo, `GroupService.createInvitation`/`respondToInvitation`, `/groups/{id}/invite` etc.) — requires dropping the `group_invitations` table since `ddl-auto: update` won't.
- Membership-gate the remaining group-scoped reads; stop `GET /api/users` from listing all users.
- `MAIL_USER`/`MAIL_PASS`/`GOOGLE_CLIENT_ID` are still committed with real-looking defaults in `application.yml` — externalize these the same way the DB credentials were (DB credentials are already fully externalized to the gitignored `backend/.env`, see Configuration above).
