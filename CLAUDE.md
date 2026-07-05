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
No Maven wrapper — use a system `mvn`. A running PostgreSQL is required.

```bash
mvn spring-boot:run      # API on http://localhost:8080 (Swagger at /swagger-ui.html)
mvn clean package        # build the jar
mvn test                 # runs the SettlementCalculator unit tests
```

Offline builds may fail if the local Maven repo is cold; a first online build populates it, after which `mvn -o` works.

### Frontend (from `Splitwise/`)
```bash
npm install
npm run dev              # Vite dev server (port 3000 per --port, else vite.config)
npm run build            # tsc --noEmit && vite build  (type errors now FAIL the build)
npm run typecheck        # tsc --noEmit -p tsconfig.app.json
npm run lint             # eslint
```

## Configuration

Backend config in `Splitwise/backend/src/main/resources/application.yml`, active profile `postgres`. Overridable via env: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `MAIL_USER`, `MAIL_PASS`, `GOOGLE_CLIENT_ID`. (Committed defaults still contain real-looking credentials — externalizing/rotating them is an outstanding hardening item.)

Hibernate owns the schema (`ddl-auto: update`); no migration files. Frontend API base URL is hard-coded to `http://localhost:8080/api` in `src/lib/api.ts`. CORS allows origins 3000, 9000, 5173.

## Core domain model

Four-level hierarchy:

```
Group ──< Event ──< SubEvent ──< Share ──1:1── PaymentStatus
(people) (a bucket) (one expense) (one debtor's  (workflow/proof state)
                                    portion)
```

Plus a **`Settlement` ledger** (see below), which is the source of truth for balances.

- **SubEvent** = a single expense: a `payer`, a `totalAmount`, and a list of `Share`s. The selected `payerId` is **honored** (you can record an expense someone else paid); the payer must be a group member. Expenses can be **edited (`PUT /api/subevents/{id}`)** and **deleted (`DELETE`)** by the event creator or the payer. Recurring expenses can be stopped (`PUT /api/subevents/{id}/recurring/stop`).
- **Share** = how much one user owes the payer. `SubEventService` persists exactly the shares passed; they must sum to `totalAmount` (±0.01). A debtor share starts `UNPAID`; a share whose user *is* the payer starts `CONFIRMED`.
- **PaymentStatus** = per-share workflow/proof state `UNPAID → MARKED_AS_PAID → CONFIRMED`. **It no longer drives balance math** — it records who marked paid, `transactionRef`, `proofUrl`, timestamps.

### Settlement ledger (the heart of the app)
Balances are computed as **shares − settlements**, in a pure, DB-free `settlement.SettlementCalculator` (unit-tested in `SettlementCalculatorTest`):

```
net(user) = Σ(shares where user is payer) − Σ(shares where user is debtor)
          + Σ(settlements where user paid) − Σ(settlements where user received)
```

- `SettlementCalculator.simplify(net)` runs the greedy min-cash-flow to produce a minimal set of "who pays whom" edges. Amounts under `0.005` are treated as settled.
- **Confirming** a share (`PaymentService.confirm`, only the payer) writes a `Settlement(debtor→payer, share amount)` linked to the sub-event.
- **Settling a simplified/net edge** (`PaymentService.settlePairwise`, `POST /api/payments/settle-pairwise`) writes **one** `Settlement` for exactly the edge amount. The actor must be a group member and one of the two parties. This is the correct fix for circular/indirect debts — it never touches unrelated debts (the old share-flipping approach did).
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
- Exceptions: throw `NotFoundException` / `ForbiddenActionException`; `GlobalExceptionHandler` maps them.

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
- Membership-gate the remaining group-scoped reads; stop `GET /api/users` from listing all users; externalize committed credentials.
