# Trading Helper — Task Breakdown

## Milestone 1: Database Setup + Core Models

### Task 1.1: Install backend dependencies
- **Description:** Add better-sqlite3, drizzle-orm, drizzle-kit, plaid, and vitest to the project. Configure `next.config.ts` with `serverExternalPackages: ['better-sqlite3']`.
- **Requirements:** Foundation for all backend work
- **Files to create/modify:**
  - `app/package.json` — add dependencies
  - `app/next.config.ts` — add serverExternalPackages
  - `app/drizzle.config.ts` — Drizzle Kit configuration pointing to SQLite
- **Acceptance:** `npm install` succeeds, `npx drizzle-kit generate` runs without error

### Task 1.2: Define Drizzle schema
- **Description:** Create the full database schema in Drizzle ORM matching the architecture document: accounts, assets, levels, checklist_factors, trade_evaluations, factor_scores, trade_outcomes. Include all indexes.
- **Requirements:** FR-001, FR-002, FR-003, FR-005, FR-010, FR-013
- **Files to create:**
  - `app/src/db/schema.ts` — all table definitions with Drizzle's SQLite builders
- **Acceptance:** Schema compiles, all tables and columns match architecture.md section 4

### Task 1.3: Database connection singleton
- **Description:** Create the database connection module that initializes better-sqlite3 with WAL mode and foreign keys, wraps it with Drizzle ORM. Ensure the `data/` directory and DB file are created automatically.
- **Requirements:** NFR-002
- **Files to create:**
  - `app/src/db/index.ts` — singleton connection
- **Acceptance:** Importing `db` from any API route gives a working Drizzle instance. WAL mode and foreign keys are enabled.

### Task 1.4: Generate and run initial migration
- **Description:** Use Drizzle Kit to generate the initial SQL migration from the schema, then apply it. Add an npm script for running migrations.
- **Requirements:** Foundation
- **Files to create/modify:**
  - `app/drizzle/` — generated migration files
  - `app/package.json` — add `db:migrate` and `db:push` scripts
- **Acceptance:** `npm run db:push` creates all tables in the SQLite file. Tables can be verified with `sqlite3 data/trading-helper.db ".tables"`.

### Task 1.5: Seed script with default data
- **Description:** Create a seed script that populates: (a) the 9 default checklist factors from FR-004 with correct weights, types, and config_json, (b) 7 sample assets matching the prototype (BTC, SOL, AAPL, GLD, SLV, ETH, TSLA), (c) 2 default accounts (Taxable $92K, IRA $250K), (d) sample S/R levels for BTC. Seed should be idempotent (skip if data exists).
- **Requirements:** FR-004, FR-001, FR-010
- **Files to create:**
  - `app/src/db/seed.ts` — seed logic
- **Files to modify:**
  - `app/package.json` — add `db:seed` script
- **Acceptance:** Running `npm run db:seed` populates all default data. Running it twice does not duplicate data.

### Task 1.6: Shared TypeScript types
- **Description:** Define shared types used across API routes and frontend: Asset, Level, ChecklistFactor, TradeEvaluation, FactorScore, Recommendation, TradeOutcome, Account. Also define API request/response shapes.
- **Requirements:** All FRs (type foundation)
- **Files to create:**
  - `app/src/types/index.ts`
- **Acceptance:** Types compile and are importable from both `app/src/app/api/` and `app/src/app/` paths.

---

## Milestone 2: Asset & Level Management API + Frontend Integration

### Task 2.1: Assets CRUD API routes
- **Description:** Implement API route handlers for asset management: GET /api/assets (list, filterable by asset_class and search query), POST /api/assets (create), GET /api/assets/[id] (detail), PUT /api/assets/[id] (update), DELETE /api/assets/[id] (soft archive — sets active=0).
- **Requirements:** FR-001
- **Files to create:**
  - `app/src/app/api/assets/route.ts` — GET, POST
  - `app/src/app/api/assets/[id]/route.ts` — GET, PUT, DELETE
- **Acceptance:** All CRUD operations work via curl/Postman. Archived assets excluded from GET list by default. Validation returns 400 for missing required fields.

### Task 2.2: Levels CRUD API routes
- **Description:** Implement API route handlers for S/R level management: GET /api/assets/[id]/levels (list levels for asset), POST /api/assets/[id]/levels (create single or batch — batch used for fib calculator results), PUT and DELETE for individual levels. Support invalidating a level (setting active=0).
- **Requirements:** FR-002
- **Files to create:**
  - `app/src/app/api/assets/[id]/levels/route.ts` — GET, POST
- **Acceptance:** Levels are correctly associated with assets. Batch creation works (fib calculator sends 5 levels at once). Invalidated levels returned but marked inactive.

### Task 2.3: Connect Assets page to API
- **Description:** Replace the mock data in `app/src/app/assets/page.tsx` with API calls. Fetch assets on mount, wire up filter and search to query params. Add an "Add Asset" form/modal that POSTs to the API.
- **Requirements:** FR-001
- **Files to modify:**
  - `app/src/app/assets/page.tsx`
- **Acceptance:** Asset list loads from database. Filter by class works. Search works. Adding a new asset persists and appears in the list.

### Task 2.4: Connect Asset Detail page to API
- **Description:** Replace mock data in `app/src/app/assets/[id]/page.tsx` with API calls. Fetch asset detail and its levels. Wire up the Fib Calculator "Add Fib Levels" button to POST batch levels. Add ability to manually add a single S/R level. Add ability to invalidate a level.
- **Requirements:** FR-002
- **Files to modify:**
  - `app/src/app/assets/[id]/page.tsx`
- **Acceptance:** S/R levels load from database for the correct asset. Fib calculator creates levels via API. Manual level addition works. Invalidating a level updates its status.

---

## Milestone 3: Checklist & Scoring Engine

### Task 3.1: Scoring engine pure function
- **Description:** Extract the scoring logic currently inline in `evaluate/page.tsx` into a standalone pure function in `app/src/lib/scoring.ts`. The function takes factor definitions (from DB), raw user values, trade direction, and R:R ratio. Returns individual factor scores and a composite score 0-100 with signal color.
- **Requirements:** FR-005
- **Files to create:**
  - `app/src/lib/scoring.ts`
- **Acceptance:** Function is pure (no side effects, no DB access). Produces the same results as the current inline scoring logic in the prototype. Unit tests pass (see Task 3.2).

### Task 3.2: Scoring engine unit tests
- **Description:** Write Vitest unit tests for the scoring engine. Cover: all factor types (scale, pass/fail, numeric), direction-dependent scoring (long vs short), R:R tier scoring, composite score normalization, signal thresholds (green >= 75, yellow >= 50, red < 50), edge cases (all factors null, all max).
- **Requirements:** FR-005
- **Files to create:**
  - `app/src/lib/__tests__/scoring.test.ts`
- **Files to modify:**
  - `app/package.json` — add vitest config or `vitest.config.ts`
- **Acceptance:** All tests pass. Coverage of scoring.ts is >90%.

### Task 3.3: Position sizing pure function
- **Description:** Implement position sizing calculator in `app/src/lib/position-sizing.ts`. Calculates: risk amount, position size (shares), total cost, IRA eligibility check. For high-conviction trades (score >= 80), allow risk up to 2%.
- **Requirements:** FR-006, FR-007 (IRA check)
- **Files to create:**
  - `app/src/lib/position-sizing.ts`
- **Acceptance:** Matches the PRD example: $92K account, 1% risk, entry $100, stop $95 = 184 shares. IRA + short = not eligible with warning message. High conviction allows 2% risk.

### Task 3.4: Position sizing unit tests
- **Description:** Write Vitest unit tests for position sizing. Cover: standard calculation, IRA restriction for shorts, IRA restriction for naked options/margin, high-conviction 2% risk, zero risk distance edge case, very small account.
- **Requirements:** FR-006, FR-007
- **Files to create:**
  - `app/src/lib/__tests__/position-sizing.test.ts`
- **Acceptance:** All tests pass.

### Task 3.5: Checklist API routes
- **Description:** Implement API route handlers: GET /api/checklist (list all factors ordered by sort_order), POST /api/checklist (create new factor), PUT /api/checklist/[id] (update factor weight, name, config), DELETE /api/checklist/[id] (remove factor).
- **Requirements:** FR-003, FR-004
- **Files to create:**
  - `app/src/app/api/checklist/route.ts` — GET, POST
  - `app/src/app/api/checklist/[id]/route.ts` — PUT, DELETE
- **Acceptance:** GET returns the seeded default factors in order. Creating a factor assigns the next sort_order. Updating weight persists. Deleting removes the factor.

### Task 3.6: Connect Settings/Checklist tab to API
- **Description:** Replace mock data in the Checklist tab of `app/src/app/settings/page.tsx` with API calls. Fetch factors from GET /api/checklist. Wire weight input changes to PUT. Wire "Add Factor" button to POST. Add delete capability.
- **Requirements:** FR-003
- **Files to modify:**
  - `app/src/app/settings/page.tsx`
- **Acceptance:** Checklist factors load from database. Changing a weight saves immediately (or on blur). Adding a new factor persists. Total weight recalculates from real data.

---

## Milestone 4: Trade Evaluation Flow

### Task 4.1: Evaluation creation API route
- **Description:** Implement POST /api/evaluations. Accepts: assetId, accountId, direction, timeframe, entry, stop, targets, and factorValues (Record<factorId, rawValue>). Internally: creates the evaluation row, calls scoring engine, calls position sizing, checks IRA eligibility, stores factor_scores rows. Returns the complete evaluation with all computed data.
- **Requirements:** FR-005, FR-006, FR-007, FR-008
- **Files to create:**
  - `app/src/app/api/evaluations/route.ts` — POST
- **Acceptance:** POST creates a full evaluation with composite score, signal, factor scores, position sizing, and IRA eligibility. All data persisted in DB. Response includes everything needed for the result page.

### Task 4.2: Evaluation detail API route
- **Description:** Implement GET /api/evaluations/[id]. Returns the full evaluation including: evaluation data, all factor scores with factor names, position sizing, and any trade outcome if it exists.
- **Requirements:** FR-005, FR-008
- **Files to create:**
  - `app/src/app/api/evaluations/[id]/route.ts` — GET
- **Acceptance:** Returns complete evaluation data. Includes joined factor names for display. Includes outcome if one exists.

### Task 4.3: Confirm and Pass API routes
- **Description:** Implement PUT /api/evaluations/[id]/confirm (sets status='confirmed', confirmed_at=now) and PUT /api/evaluations/[id]/pass (sets status='passed', passed_at=now, accepts optional pass_reason in body).
- **Requirements:** FR-008
- **Files to create:**
  - `app/src/app/api/evaluations/[id]/confirm/route.ts` — PUT
  - `app/src/app/api/evaluations/[id]/pass/route.ts` — PUT
- **Acceptance:** Status transitions work correctly. Cannot confirm an already-passed evaluation (returns 400). Timestamps are set.

### Task 4.4: Connect Evaluate page to API (Step 1 — Setup)
- **Description:** Replace hardcoded asset list and account options in `evaluate/page.tsx` Step 1 with API data. Fetch assets from GET /api/assets, accounts from GET /api/accounts. Fetch S/R levels for the selected asset from GET /api/assets/[id]/levels. Keep TradingView chart as-is.
- **Requirements:** FR-001, FR-002, FR-005
- **Files to modify:**
  - `app/src/app/evaluate/page.tsx`
- **Acceptance:** Asset dropdown populated from DB. Account selector populated from DB. S/R levels panel shows levels from DB for selected asset. Changing asset re-fetches levels.

### Task 4.5: Connect Evaluate page to API (Step 2 — Scoring)
- **Description:** Replace hardcoded factor list in Step 2 with checklist factors from GET /api/checklist. Render the correct input control for each factor based on score_type and config_json. On "View Recommendation" click, POST to /api/evaluations with all collected data. Navigate to /evaluate/result/[evaluationId] with the returned ID.
- **Requirements:** FR-003, FR-005
- **Files to modify:**
  - `app/src/app/evaluate/page.tsx`
- **Acceptance:** Checklist factors render from DB data. User can fill in all factors. Submitting creates a real evaluation. Navigates to result page with correct evaluation ID.

### Task 4.6: Connect Result page to API
- **Description:** Update `evaluate/result/page.tsx` to accept an evaluation ID (via query param or route param — e.g., `/evaluate/result?id=123`). Fetch evaluation from GET /api/evaluations/[id]. Display real data: traffic light, composite score, trade plan, position sizing, factor breakdown. Wire "Confirm" button to PUT /api/evaluations/[id]/confirm. Wire "Pass" button to PUT /api/evaluations/[id]/pass (with optional reason modal). Navigate to dashboard on success.
- **Requirements:** FR-005, FR-006, FR-008
- **Files to modify:**
  - `app/src/app/evaluate/result/page.tsx`
- **Acceptance:** Result page displays real scored data. Confirm and Pass buttons work. After confirming, trade appears on dashboard as confirmed.

### Task 4.7: Connect Dashboard to API
- **Description:** Replace mock data on the dashboard (`page.tsx`) with real API data. Fetch accounts from GET /api/accounts (for account cards). Fetch recent evaluations from GET /api/journal?limit=5 (for recent evaluations table). Fetch confirmed+open evaluations for the "Open Trades" section. Wire "Log Outcome" button to navigate to journal page.
- **Requirements:** FR-008, FR-010
- **Files to modify:**
  - `app/src/app/page.tsx`
- **Acceptance:** Dashboard shows real account balances. Recent evaluations table shows real data. Open trades section shows confirmed trades without outcomes. "New Trade Evaluation" button still works.

---

## Milestone 5: Account Management + Plaid Integration

### Task 5.1: Accounts CRUD API routes
- **Description:** Implement API route handlers: GET /api/accounts (list all), POST /api/accounts (create manual account with name, type, balance, risk%), PUT /api/accounts/[id] (update type, risk%, manual balance). GET /api/accounts/[id] for detail.
- **Requirements:** FR-010
- **Files to create:**
  - `app/src/app/api/accounts/route.ts` — GET, POST
  - `app/src/app/api/accounts/[id]/route.ts` — GET, PUT
- **Acceptance:** CRUD operations work. Manual account creation stores balance. Updating risk % persists.

### Task 5.2: Plaid integration library
- **Description:** Implement Plaid client setup and helper functions in `app/src/lib/plaid.ts`: createLinkToken (returns a Link token), exchangePublicToken (exchanges token, fetches accounts, returns account data), refreshBalances (fetches current balance, respects 4-hour cache). Handle Plaid being unconfigured gracefully (return null/skip when env vars are missing).
- **Requirements:** FR-010
- **Files to create:**
  - `app/src/lib/plaid.ts`
  - `app/.env.local.example` — template for Plaid env vars
- **Acceptance:** With sandbox credentials, link token creation works. Token exchange returns account data. Refresh returns updated balances. Missing env vars do not crash the app.

### Task 5.3: Plaid API routes
- **Description:** Implement POST /api/plaid/link-token (creates and returns a Plaid Link token) and POST /api/plaid/exchange (accepts public_token from Plaid Link, exchanges it, creates account records in DB with plaid_account_id and plaid_access_token, returns created accounts). Implement POST /api/accounts/[id]/refresh (refreshes balance from Plaid).
- **Requirements:** FR-010
- **Files to create:**
  - `app/src/app/api/plaid/link-token/route.ts`
  - `app/src/app/api/plaid/exchange/route.ts`
  - `app/src/app/api/accounts/[id]/refresh/route.ts`
- **Acceptance:** Full Plaid Link flow works in sandbox mode. Accounts created with Plaid data. Refresh updates balance and balance_updated_at.

### Task 5.4: Connect Settings/Accounts tab to API
- **Description:** Replace mock data in the Accounts tab of `app/src/app/settings/page.tsx` with API calls. Fetch accounts from GET /api/accounts. Wire "Connect with Plaid" button to open Plaid Link (using react-plaid-link or direct integration). Wire "Add Account Manually" to a form that POSTs to /api/accounts. Wire account type and risk % changes to PUT. Show Plaid sync status from balance_updated_at. Wire "Unlink" to remove Plaid credentials. Show stale balance warning when balance_updated_at > 4 hours ago.
- **Requirements:** FR-010
- **Files to modify:**
  - `app/src/app/settings/page.tsx`
- **Dependencies:** Task 5.1, Task 5.3
- **Acceptance:** Accounts load from DB. Plaid Link flow works end-to-end in sandbox. Manual account creation works. Sync status shows correctly. Stale warning displays when appropriate.

---

## Milestone 6: Trade Journal

### Task 6.1: Trade outcome API route
- **Description:** Implement POST /api/evaluations/[id]/outcome. Accepts: actualEntry, actualExit, pnl, notes. Creates a trade_outcome record linked to the evaluation. Validates that the evaluation exists and is in 'confirmed' status.
- **Requirements:** FR-013
- **Files to create:**
  - `app/src/app/api/evaluations/[id]/outcome/route.ts` — POST
- **Acceptance:** Outcome is stored and linked to evaluation. Cannot log outcome for non-confirmed evaluations (returns 400). Cannot log duplicate outcomes (returns 409).

### Task 6.2: Journal listing API route
- **Description:** Implement GET /api/journal. Returns evaluations with their outcomes, sorted by creation date descending. Support query params: status filter (open/closed/passed/all), limit, offset. "Open" = confirmed without outcome. "Closed" = confirmed with outcome. "Passed" = passed status.
- **Requirements:** FR-013
- **Files to create:**
  - `app/src/app/api/journal/route.ts` — GET
- **Acceptance:** Returns evaluations with joined asset ticker, direction, timeframe, score, signal, status, and P&L (from outcome). Filtering works correctly.

### Task 6.3: Connect Journal page to API
- **Description:** Replace mock data in `app/src/app/journal/page.tsx` with API calls. Fetch journal entries from GET /api/journal. Wire filter buttons to query params. Wire "Log Outcome" button+modal to POST /api/evaluations/[id]/outcome. After saving outcome, refresh the journal list. Pre-populate the recommended entry/exit from the evaluation data in the modal.
- **Requirements:** FR-013
- **Files to modify:**
  - `app/src/app/journal/page.tsx`
- **Acceptance:** Journal loads real data from DB. Filters work. Log Outcome modal submits to API and persists. P&L shows correctly after logging. Recommended vs actual entry/exit shown.

---

## Milestone 7: Integration & Polish

### Task 7.1: Auto-refresh Plaid balances on app load
- **Description:** Add logic to the dashboard (or a layout-level effect) that checks each Plaid-connected account's balance_updated_at. If older than 4 hours, trigger POST /api/accounts/[id]/refresh in the background. Show a brief "refreshing..." indicator on the account card while updating. Show stale warning if refresh fails.
- **Requirements:** FR-010
- **Files to modify:**
  - `app/src/app/page.tsx` — or create a shared hook/component
- **Acceptance:** Stale accounts are refreshed automatically. UI shows sync status. Failed refreshes show warning with last known balance.

### Task 7.2: Error handling and loading states
- **Description:** Audit all pages for consistent error handling and loading states. Add: loading skeletons for data fetches, error messages with retry buttons, toast notifications for successful actions (confirm trade, save outcome, etc.), form validation messages on API routes.
- **Requirements:** NFR-001 (perceived performance)
- **Files to modify:**
  - All page files under `app/src/app/`
  - All API route files (consistent error response format)
- **Acceptance:** Every page shows a loading state while fetching. API errors display user-friendly messages. Actions show success feedback.

### Task 7.3: End-to-end smoke test
- **Description:** Write a manual test script (or Vitest integration test) that exercises the complete flow: create asset, add levels, create evaluation with scoring, view recommendation, confirm trade, log outcome, verify in journal.
- **Requirements:** All FRs
- **Files to create:**
  - `app/src/__tests__/e2e-flow.test.ts` (or a documented manual test script)
- **Acceptance:** The full happy path works end-to-end. A trade can be taken from evaluation to journal outcome without errors.

### Task 7.4: README and dev setup instructions
- **Description:** Update the project README with: how to install dependencies, how to set up the database (migrate + seed), how to configure Plaid (optional), how to start the dev server. Include the localhost:3001 URL.
- **Requirements:** Developer experience
- **Files to modify:**
  - `app/README.md` (or create if doesn't exist)
- **Acceptance:** A developer can clone, follow the README, and have a working app with seed data in under 5 minutes.
