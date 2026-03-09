# Trading Helper — Architecture Document

## 1. Overview

Trading Helper is a single-user, localhost-only trade decision-support system. It scores potential trades against a configurable checklist, generates position-sized recommendations, and maintains a trade journal. The entire system runs as a single Next.js 16 application — frontend pages and API route handlers in one project — backed by a local SQLite database.

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 16 (App Router) | Already scaffolded; unified frontend + API |
| Language | TypeScript | Type safety across frontend and backend |
| Frontend | React 19 + Tailwind CSS 4 | Already built as prototype with all screens |
| Database | SQLite via better-sqlite3 | File-based, zero config, fast for single-user |
| ORM | Drizzle ORM | Lightweight, type-safe, excellent SQLite support |
| API | Next.js API route handlers | Colocated with frontend, no separate server |
| Brokerage Data | @plaid/plaid-node SDK | Read-only account balances and holdings |
| Charts | TradingView widget (client-side) | Already embedded, no backend work needed |
| Testing | Vitest | Fast, TypeScript-native |
| Runtime | Node.js, localhost:3001 | Local-only for MVP |

## 3. Project Structure

```
app/
├── data/
│   └── trading-helper.db          # SQLite database file (gitignored)
├── drizzle/
│   └── migrations/                # Drizzle migration files
├── drizzle.config.ts              # Drizzle Kit configuration
├── src/
│   ├── db/
│   │   ├── index.ts               # Database connection (better-sqlite3 + Drizzle)
│   │   ├── schema.ts              # Drizzle table definitions
│   │   └── seed.ts                # Default checklist factors + sample data
│   ├── lib/
│   │   ├── scoring.ts             # Scoring engine — pure function
│   │   ├── position-sizing.ts     # Position size calculator — pure function
│   │   └── plaid.ts               # Plaid client setup + helpers
│   ├── types/
│   │   └── index.ts               # Shared TypeScript types (API request/response shapes)
│   ├── app/
│   │   ├── layout.tsx             # Root layout (existing)
│   │   ├── page.tsx               # Dashboard (existing prototype)
│   │   ├── evaluate/
│   │   │   ├── page.tsx           # Trade evaluation form (existing prototype)
│   │   │   └── result/
│   │   │       └── page.tsx       # Recommendation / confirmation (existing prototype)
│   │   ├── assets/
│   │   │   ├── page.tsx           # Asset list (existing prototype)
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Asset detail + S/R levels (existing prototype)
│   │   ├── journal/
│   │   │   └── page.tsx           # Trade journal (existing prototype)
│   │   ├── settings/
│   │   │   └── page.tsx           # Settings — accounts + checklist (existing prototype)
│   │   └── api/
│   │       ├── assets/
│   │       │   ├── route.ts       # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts   # GET, PUT, DELETE
│   │       │       └── levels/
│   │       │           └── route.ts   # GET, POST levels for asset
│   │       ├── checklist/
│   │       │   ├── route.ts       # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       └── route.ts   # PUT, DELETE
│   │       ├── evaluations/
│   │       │   ├── route.ts       # POST (create evaluation + score + recommendation)
│   │       │   └── [id]/
│   │       │       ├── route.ts   # GET (evaluation with scores + recommendation)
│   │       │       ├── confirm/
│   │       │       │   └── route.ts   # PUT (confirm trade)
│   │       │       ├── pass/
│   │       │       │   └── route.ts   # PUT (pass on trade)
│   │       │       └── outcome/
│   │       │           └── route.ts   # POST (log trade outcome)
│   │       ├── accounts/
│   │       │   ├── route.ts       # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts   # PUT (update), GET
│   │       │       └── refresh/
│   │       │           └── route.ts   # POST (refresh from Plaid)
│   │       ├── plaid/
│   │       │   ├── link-token/
│   │       │   │   └── route.ts   # POST (create Plaid Link token)
│   │       │   └── exchange/
│   │       │       └── route.ts   # POST (exchange public token)
│   │       └── journal/
│   │           └── route.ts       # GET (list evaluations with outcomes)
│   └── components/                # Existing UI components
│       ├── Card.tsx
│       ├── FactorBar.tsx
│       ├── Sidebar.tsx
│       ├── SignalBadge.tsx
│       ├── Tooltip.tsx
│       ├── TopBar.tsx
│       └── TradingViewChart.tsx
├── package.json
├── tsconfig.json
└── .env.local                     # PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV
```

## 4. Database Schema

SQLite database at `app/data/trading-helper.db`. Schema defined with Drizzle ORM in `app/src/db/schema.ts`.

### 4.1 Tables

**accounts**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| name | TEXT NOT NULL | e.g., "Taxable Brokerage" |
| account_type | TEXT NOT NULL | "taxable" / "ira" / "roth" |
| balance | REAL NOT NULL | current balance in USD |
| default_risk_pct | REAL NOT NULL DEFAULT 1.0 | risk % per trade |
| plaid_account_id | TEXT | nullable, Plaid account identifier |
| plaid_access_token | TEXT | nullable, encrypted Plaid access token |
| balance_updated_at | TEXT | ISO timestamp of last Plaid refresh |
| created_at | TEXT NOT NULL | ISO timestamp |
| updated_at | TEXT NOT NULL | ISO timestamp |

**assets**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| ticker | TEXT NOT NULL UNIQUE | e.g., "BTC", "AAPL" |
| name | TEXT NOT NULL | e.g., "Bitcoin" |
| asset_class | TEXT NOT NULL | "crypto" / "equity" / "commodity" |
| exchange | TEXT | nullable |
| active | INTEGER NOT NULL DEFAULT 1 | 1 = active, 0 = archived |
| created_at | TEXT NOT NULL | ISO timestamp |

**levels**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| asset_id | INTEGER NOT NULL | FK -> assets.id |
| price | REAL NOT NULL | price level |
| label | TEXT NOT NULL | e.g., "Fib 61.8%", "Major Support" |
| level_type | TEXT NOT NULL | "fibonacci" / "manual" / "pivot" |
| active | INTEGER NOT NULL DEFAULT 1 | 1 = active, 0 = invalidated |
| created_at | TEXT NOT NULL | ISO timestamp |

**checklist_factors**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| name | TEXT NOT NULL | factor display name |
| description | TEXT | explanation text |
| weight | INTEGER NOT NULL | contribution to composite score |
| score_type | TEXT NOT NULL | "pass_fail" / "scale" / "numeric" |
| config_json | TEXT | JSON blob for scale options, thresholds, etc. |
| sort_order | INTEGER NOT NULL | display order |
| created_at | TEXT NOT NULL | ISO timestamp |
| updated_at | TEXT NOT NULL | ISO timestamp |

**trade_evaluations**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| asset_id | INTEGER NOT NULL | FK -> assets.id |
| account_id | INTEGER NOT NULL | FK -> accounts.id |
| direction | TEXT NOT NULL | "long" / "short" |
| timeframe | TEXT NOT NULL | "Weekly" / "Daily" / "4h" / "1h" |
| entry_price | REAL NOT NULL | planned entry |
| stop_loss | REAL NOT NULL | planned stop |
| targets_json | TEXT NOT NULL | JSON array of target prices |
| composite_score | REAL | 0-100, set after scoring |
| signal | TEXT | "green" / "yellow" / "red" |
| status | TEXT NOT NULL DEFAULT 'pending' | "pending" / "confirmed" / "passed" |
| rr_ratio | REAL | risk/reward ratio |
| position_size | REAL | number of shares/units |
| position_cost | REAL | total cost of position |
| vehicle | TEXT DEFAULT 'shares' | "shares" / "options" / "futures" |
| ira_eligible | INTEGER DEFAULT 1 | 0 if IRA-ineligible |
| confirmed_at | TEXT | ISO timestamp |
| passed_at | TEXT | ISO timestamp |
| pass_reason | TEXT | optional reason for passing |
| created_at | TEXT NOT NULL | ISO timestamp |

**factor_scores**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| evaluation_id | INTEGER NOT NULL | FK -> trade_evaluations.id |
| factor_id | INTEGER NOT NULL | FK -> checklist_factors.id |
| raw_value | TEXT NOT NULL | the user's input value |
| normalized_score | REAL NOT NULL | points earned (0 to factor weight) |
| max_score | REAL NOT NULL | max possible points for this factor |

**trade_outcomes**
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | auto-increment |
| evaluation_id | INTEGER NOT NULL UNIQUE | FK -> trade_evaluations.id |
| actual_entry | REAL NOT NULL | actual entry price |
| actual_exit | REAL NOT NULL | actual exit price |
| pnl | REAL NOT NULL | profit/loss in USD |
| notes | TEXT | post-trade notes |
| closed_at | TEXT NOT NULL | ISO timestamp |
| created_at | TEXT NOT NULL | ISO timestamp |

### 4.2 Indexes

- `assets.ticker` — UNIQUE index (already from column constraint)
- `levels.asset_id` — for fast level lookups per asset
- `trade_evaluations.asset_id` — for history queries
- `trade_evaluations.status` — for filtering open/confirmed/passed
- `factor_scores.evaluation_id` — for loading all scores per evaluation

## 5. Key Modules

### 5.1 Database Connection (`app/src/db/index.ts`)

Singleton pattern. Creates the better-sqlite3 connection on first import, wraps it with Drizzle ORM. The database file is created automatically at `app/data/trading-helper.db` if it does not exist.

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('data/trading-helper.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
```

### 5.2 Scoring Engine (`app/src/lib/scoring.ts`)

Pure function. Takes factor definitions, user-provided factor values, and trade direction. Returns individual factor scores and a composite score (0-100).

**Inputs:**
- `factors: ChecklistFactor[]` — factor definitions with weights, types, and config
- `values: Record<factorId, rawValue>` — user-provided values for each factor
- `direction: 'long' | 'short'` — trade direction (affects directional scoring)
- `rrRatio: number` — auto-calculated risk/reward ratio

**Outputs:**
- `factorScores: { factorId, rawValue, normalizedScore, maxScore }[]`
- `compositeScore: number` — 0-100, normalized from weighted sum
- `signal: 'green' | 'yellow' | 'red'` — based on thresholds (75+, 50-74, <50)

**Scoring rules** (matching the prototype logic in `evaluate/page.tsx`):
- Scale factors: map each option to a fraction of the factor's weight, adjusted for direction
- Pass/fail factors: full weight if true, 0 if false
- Numeric factors (R:R): tiered scoring based on configurable thresholds
- Composite = sum of all normalized scores (weights already sum to 100)

### 5.3 Position Sizing (`app/src/lib/position-sizing.ts`)

Pure function. Calculates position size, cost, and IRA eligibility.

**Inputs:**
- `accountBalance: number`
- `riskPct: number` — default 1%, up to 2% for high-conviction (score 80+)
- `entryPrice: number`
- `stopLoss: number`
- `direction: 'long' | 'short'`
- `accountType: string` — for IRA eligibility checks

**Outputs:**
- `riskAmount: number` — balance * riskPct
- `positionSize: number` — floor(riskAmount / |entry - stop|)
- `positionCost: number` — positionSize * entryPrice
- `iraEligible: boolean` — false if short + IRA, or naked options + IRA
- `iraWarning: string | null` — explanation if not eligible

### 5.4 Plaid Integration (`app/src/lib/plaid.ts`)

Wraps the `@plaid/plaid-node` SDK. Three operations:

1. **Create Link Token** — returns a Plaid Link token for the frontend widget
2. **Exchange Public Token** — exchanges the public token from Plaid Link for an access token, then fetches account metadata (name, type, balance) and stores in the database
3. **Refresh Balances** — calls Plaid's `/accounts/balance/get` and `/investments/holdings/get` to update cached balance and holdings. Respects 4-hour cache (skips refresh if last update was <4 hours ago, unless forced).

Environment variables (`.env.local`):
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` — "sandbox" for dev, "production" for real accounts

## 6. API Design

All API routes live under `app/src/app/api/`. They use Next.js route handlers (`export async function GET/POST/PUT/DELETE`). All responses are JSON. Errors return `{ error: string }` with appropriate HTTP status codes.

### 6.1 Assets

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| GET | /api/assets | List all active assets (filterable by class) | FR-001 |
| POST | /api/assets | Create a new asset | FR-001 |
| GET | /api/assets/[id] | Get asset detail | FR-001 |
| PUT | /api/assets/[id] | Update asset metadata | FR-001 |
| DELETE | /api/assets/[id] | Archive asset (soft delete) | FR-001 |

### 6.2 Levels

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| GET | /api/assets/[id]/levels | List S/R levels for asset | FR-002 |
| POST | /api/assets/[id]/levels | Create level(s) — supports batch for fib calc | FR-002 |
| PUT | /api/assets/[id]/levels/[levelId] | Update level (e.g., invalidate) | FR-002 |
| DELETE | /api/assets/[id]/levels/[levelId] | Delete a level | FR-002 |

### 6.3 Checklist

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| GET | /api/checklist | List all checklist factors (ordered) | FR-003, FR-004 |
| POST | /api/checklist | Create a new factor | FR-003 |
| PUT | /api/checklist/[id] | Update factor (name, weight, config) | FR-003 |
| DELETE | /api/checklist/[id] | Delete a factor | FR-003 |

### 6.4 Evaluations

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| POST | /api/evaluations | Create evaluation, run scoring engine, generate recommendation | FR-005, FR-006, FR-007 |
| GET | /api/evaluations/[id] | Get full evaluation (scores, recommendation, outcome) | FR-005, FR-008 |
| PUT | /api/evaluations/[id]/confirm | Confirm trade — freeze recommendation, set status | FR-008 |
| PUT | /api/evaluations/[id]/pass | Pass on trade — set status + optional reason | FR-008 |
| POST | /api/evaluations/[id]/outcome | Log trade outcome | FR-013 |

### 6.5 Accounts

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| GET | /api/accounts | List all accounts | FR-010 |
| POST | /api/accounts | Create account manually | FR-010 |
| PUT | /api/accounts/[id] | Update account (type, risk %) | FR-010 |
| POST | /api/accounts/[id]/refresh | Refresh balance from Plaid | FR-010 |

### 6.6 Plaid

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| POST | /api/plaid/link-token | Generate Plaid Link token | FR-010 |
| POST | /api/plaid/exchange | Exchange public token, create account records | FR-010 |

### 6.7 Journal

| Method | Path | Description | PRD Ref |
|--------|------|-------------|---------|
| GET | /api/journal | List evaluations with status and outcomes, filterable | FR-013, FR-014 |

## 7. Data Flow: Core Trade Evaluation Loop

This is the primary user workflow and the heart of the application.

```
1. User opens /evaluate
   └── Frontend fetches: GET /api/assets, GET /api/accounts
       └── Populates asset dropdown and account selector

2. User selects asset, direction, timeframe, account, entry/stop/target
   └── Frontend fetches: GET /api/assets/{id}/levels
       └── Displays S/R levels panel alongside TradingView chart

3. User clicks "Continue to Checklist Scoring"
   └── Frontend fetches: GET /api/checklist
       └── Renders each factor's input control based on score_type + config_json

4. User fills in factor values, clicks "View Recommendation"
   └── Frontend sends: POST /api/evaluations
       Body: { assetId, accountId, direction, timeframe, entry, stop, targets, factorValues }
       └── Backend:
           a. Creates trade_evaluations row
           b. Calls scoring engine with factor definitions + values
           c. Calls position sizing calculator
           d. Checks IRA eligibility
           e. Creates factor_scores rows
           f. Returns full evaluation with scores, composite, signal, position sizing

5. User reviews recommendation on /evaluate/result
   └── Frontend renders traffic light, trade plan, position sizing, factor breakdown

6. User clicks "Confirm" or "Pass"
   └── PUT /api/evaluations/{id}/confirm  OR  PUT /api/evaluations/{id}/pass
       └── Backend updates status, sets timestamp

7. Later: User logs outcome from Journal page
   └── POST /api/evaluations/{id}/outcome
       Body: { actualEntry, actualExit, pnl, notes }
```

## 8. Frontend-Backend Integration Strategy

The frontend prototype already exists with mock/hardcoded data. The integration approach:

1. **Keep the existing UI components unchanged** — they define the visual design
2. **Replace mock data with API calls** — each page gets data from the corresponding API route
3. **Use React state + fetch** — no additional data-fetching library needed for MVP (can add SWR later)
4. **Pattern per page:**
   - `useEffect` on mount to fetch data from API
   - `useState` for loading/error/data states
   - Form submissions POST/PUT to API, then refresh local state
   - Optimistic UI where appropriate (e.g., confirming a trade)

## 9. Seed Data

The seed script (`app/src/db/seed.ts`) populates:

1. **Default checklist factors** (FR-004) — the 9 factors from the PRD with correct weights, types, and scoring config
2. **Sample assets** — BTC, SOL, AAPL, GLD, SLV, ETH, TSLA (matching the prototype mock data)
3. **Sample accounts** — Taxable ($92,000, 1% risk) and IRA ($250,000, 1% risk) as manual entries (Plaid connected later)
4. **Sample S/R levels for BTC** — matching the prototype's hardcoded levels

## 10. Environment & Configuration

```env
# .env.local
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
```

`next.config.ts` changes:
- Ensure `serverExternalPackages: ['better-sqlite3']` is set (required for native Node modules in Next.js)

`package.json` new dependencies:
- `better-sqlite3` + `@types/better-sqlite3`
- `drizzle-orm`
- `drizzle-kit` (dev dependency, for migrations)
- `plaid` (@plaid/plaid-node)
- `vitest` (dev dependency)

## 11. Non-Functional Requirements Mapping

| NFR | Approach |
|-----|----------|
| NFR-001: <2s scoring | Scoring is a pure function on pre-loaded data; SQLite queries are <10ms |
| NFR-002: Data persistence | SQLite WAL mode ensures writes are durable before API returns 200 |
| NFR-003: Localhost-only | Next.js dev server binds to localhost by default; no auth needed |

## 12. Testing Strategy

### 12.1 Test Structure

```
app/
  src/
    __tests__/
      unit/                    # Pure function tests (scoring, position sizing)
        scoring.test.ts
        position-sizing.test.ts
      integration/             # API + database tests per milestone
        assets.test.ts         # Milestone 2: asset & level CRUD
        checklist.test.ts      # Milestone 3: checklist factor CRUD + scoring API
        evaluations.test.ts    # Milestone 4: full evaluation flow
        accounts.test.ts       # Milestone 5: account CRUD + Plaid
        journal.test.ts        # Milestone 6: outcome logging + journal queries
      e2e/                     # Full workflow tests after milestone 7
        trade-flow.test.ts     # Create asset → add levels → evaluate → confirm → log outcome
        plaid-flow.test.ts     # Connect Plaid → verify balance → evaluation with real balance
        journal-flow.test.ts   # Confirm + pass trades → verify journal shows both
    lib/
      test-utils.ts            # Shared test helpers
```

### 12.2 Test Levels

**Unit tests (per task)**
- Test pure functions in isolation: scoring engine, position sizing calculator
- No database or API involvement
- Run by the task agent immediately after writing the code
- Must pass before the task is committed

**Integration tests (per milestone)**
- Test API routes end-to-end with a real SQLite database
- Use a separate test database (`data/test.db`) that gets wiped before each test suite
- Verify that API routes read/write correct data to the database
- Seed the test database with known data via `test-utils.ts` helpers
- Run the full test suite (all milestones) at each milestone boundary to catch regressions

**End-to-end tests (after milestone 7)**
- Test the primary user workflows by hitting API routes in sequence, simulating what the frontend does
- Verify cross-feature interactions (e.g., confirming a trade creates a journal entry that can later receive an outcome)
- Not browser/UI tests — they hit the API directly for speed

### 12.3 Test Database

```typescript
// app/src/lib/test-utils.ts

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../db/schema';

export function createTestDb() {
  const sqlite = new Database(':memory:');  // in-memory for speed
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: 'drizzle/migrations' });
  return { db, sqlite };
}

export function seedTestData(db: ReturnType<typeof createTestDb>['db']) {
  // Insert default checklist factors (FR-004)
  // Insert sample assets: BTC, AAPL, GLD
  // Insert sample accounts: Taxable ($92K), IRA ($250K)
  // Insert sample S/R levels for BTC
}
```

- In-memory SQLite for speed — no file I/O, no cleanup needed
- Fresh database per test suite — no state leakage between tests
- Migrations applied to ensure schema matches production
- Seed function inserts known data matching the PRD defaults

### 12.4 Test Execution

| When | What runs | Purpose |
|------|-----------|---------|
| After each task | Unit tests for that task's code | Verify the new code works |
| After each milestone merge to `dev` | Full test suite (all unit + integration) | Catch regressions |
| After milestone 7 | Full suite + e2e tests | Verify all workflows work end-to-end |

### 12.5 What Each Level Catches

| Bug type | Caught by |
|----------|-----------|
| Scoring math is wrong | Unit tests |
| Position sizing formula off | Unit tests |
| API route returns wrong shape | Integration tests |
| Asset creation breaks level queries | Integration tests |
| Confirming a trade doesn't save the recommendation | Integration tests |
| Evaluation flow works but journal can't find the outcome | E2E tests |
| Database migration broke an earlier feature | Regression (full suite at milestone boundary) |

## 13. What Is NOT in MVP Architecture

These are deferred to v0.2 per the PRD's scope section:

- Analyst call logging and consensus scoring (FR-009)
- Performance analytics with factor correlation (FR-014 advanced)
- TradingView webhook receiver (FR-015)
- Portfolio-level risk tracking (FR-011)
- Correlated exposure tracking (FR-012)
- Vehicle suggestion engine (FR-007 — MVP defaults to "shares")
