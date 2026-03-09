# Trading Helper — Product Requirements Document

## 1. Overview

Trading Helper is a personal decision-support system that synthesizes technical analysis, analyst sentiment, and market data into scored trade recommendations across stocks, crypto (BTC/SOL), and precious metals/commodities. The system codifies the trader's personal checklist into weighted, scored factors and presents a clear go/no-go recommendation that the trader confirms before executing manually.

## 2. Problem Statement

Active traders who follow multiple analysts and maintain their own technical analysis face a synthesis problem: consolidating trend data, RSI, mean reversion signals, support/resistance levels, and external opinions across multiple timeframes and asset classes is manual, slow, and error-prone under pressure. Opportunities are missed while processing, and checklist discipline breaks down when speed feels urgent. There is no tool that combines a trader's personal process with multi-source data into a single scored recommendation.

## 3. Goals & Success Metrics

- Reduce trade evaluation time from 10+ minutes of manual synthesis to under 60 seconds of dashboard review
- Enforce checklist discipline: 100% of trades pass through the scoring system before execution
- Track and improve: after 30 days of use, identify which checklist factors are most predictive
- Achieve a positive expectancy (win rate × avg win > loss rate × avg loss) as measured by the trade journal
- MVP usable within 1-2 weeks of build start

## 4. Target Users

### Primary: The Trader (You)
- Active trader across equities, crypto (BTC, SOL), and commodities
- Two accounts: taxable (~$92K) and IRA (~$250K)
- Uses TradingView for charting, Fidelity for execution
- Follows analysts: InvestAnswers, TradingApologist, CamelFinance
- Trades long and short via shares/spot, options, and futures
- Timeframes: weekly, daily, 4h, 1h
- Wants to trade for a living — quality over quantity

## 5. User Stories

### Must Have
- US-001: As a trader, I want to input my key S/R levels and fib retracements for an asset so that the system knows my levels.
- US-002: As a trader, I want the system to score a potential trade against my checklist so that I get an objective composite score before entering.
- US-003: As a trader, I want to see a one-page recommendation with entry, stop, targets, and R:R so that I can confirm or reject in under 60 seconds.
- US-004: As a trader, I want to log analyst calls (asset, direction, conviction, reasoning) so that their sentiment is factored into scoring.
- US-005: As a trader, I want automatic position sizing based on my account size, risk %, and stop distance so that I never risk more than I intend.
- US-006: As a trader, I want to log trade outcomes so that I can track system accuracy over time.
- US-007: As a trader, I want the system to flag when a recommendation is not IRA-eligible so that I don't attempt invalid trades in my IRA.

### Should Have
- US-008: As a trader, I want TradingView alerts to push indicator data into the system so that I don't have to manually enter RSI/trend/mean reversion signals.
- US-009: As a trader, I want to see which checklist factors are most predictive of winning trades so that I can refine my process.
- US-010: As a trader, I want portfolio-level risk tracking so that I know my total open risk and correlated exposure at all times.
- US-011: As a trader, I want drawdown circuit breakers that reduce position sizes automatically when I'm in a losing streak.

### Could Have
- US-012: As a trader, I want on-chain data (exchange flows, MVRV) integrated for crypto trades.
- US-013: As a trader, I want automated ingestion of analyst content from YouTube/X via AI summarization.
- US-014: As a trader, I want the system to suggest weight adjustments based on historical performance data.
- US-015: As a trader, I want a mobile-friendly view for checking recommendations on the go.

### Won't Have (v1)
- US-016: Auto-execution of trades
- US-017: Real-time streaming data feeds
- US-019: Broker API integration (Fidelity has none)

## 6. Functional Requirements

### 6.1 Asset & Level Management

**FR-001: Asset Profile Creation**
Description: User can create and manage profiles for assets they trade (stocks, crypto, commodities) with metadata (asset class, ticker, exchange).
Priority: Must Have
Acceptance Criteria:
- GIVEN the user is on the asset management page WHEN they add a new asset with ticker "BTC", class "crypto", and exchange "multiple" THEN the asset appears in their asset list and is available for trade evaluation
- GIVEN an asset exists WHEN the user edits its metadata THEN the changes are persisted and reflected everywhere the asset appears
- GIVEN an asset exists WHEN the user archives it THEN it no longer appears in active lists but historical data is preserved

**FR-002: Support/Resistance Level Input**
Description: User can input and manage S/R levels per asset, including fib retracement levels and manually identified buy/sell zones.
Priority: Must Have
Acceptance Criteria:
- GIVEN an asset profile exists WHEN the user adds a support level at $95,000 with label "fib 61.8" and type "fibonacci" THEN the level is stored and displayed on the asset's level chart
- GIVEN an asset has S/R levels WHEN the user marks a level as invalidated THEN it is visually distinguished and excluded from active scoring
- GIVEN an asset profile WHEN the user inputs fib retracement levels by specifying a swing high and swing low THEN the system calculates and stores levels at 23.6%, 38.2%, 50%, 61.8%, and 78.6%

### 6.2 Checklist & Scoring Engine

**FR-003: Checklist Configuration**
Description: User can define their trade checklist as a set of weighted, scored factors. Each factor has a name, description, weight, and scoring method (pass/fail, scale 1-5, or numeric).
Priority: Must Have
Acceptance Criteria:
- GIVEN the user is on checklist config WHEN they add a factor "Weekly Trend Alignment" with weight 15 and type "pass/fail" THEN the factor appears in the checklist and is used in all future trade evaluations
- GIVEN a checklist factor exists WHEN the user changes its weight from 15 to 20 THEN future trade scores reflect the new weight; historical scores are not retroactively changed
- GIVEN the checklist has factors with total weights summing to any value THEN the system normalizes scores to a 0-100 scale

**FR-004: Default Checklist (Pre-configured)**
Description: The system ships with a default checklist based on the trader's current process, pre-populated and editable.
Priority: Must Have
Acceptance Criteria:
- GIVEN a new installation WHEN the user first accesses the checklist THEN it contains the following pre-configured factors:
  - Trend Direction (weekly/daily) — weight: 15, type: scale (strong up/up/neutral/down/strong down)
  - Trend Direction (4h/1h) — weight: 10, type: scale
  - RSI (14-period) status — weight: 10, type: scale (overbought/neutral/oversold per timeframe thresholds: 70/30 for W/D, 80/20 for 4h/1h)
  - RSI Divergence — weight: 10, type: pass/fail
  - Mean Reversion Signal (Bollinger Band 20/2) — weight: 10, type: pass/fail (price at/beyond 2nd band)
  - Mean Reversion Confirmation (VWAP deviation for intraday, MA distance for D/W) — weight: 5, type: pass/fail
  - Price Near Key S/R Level — weight: 15, type: scale (at level/within 1%/within 2%/not near)
  - Risk/Reward Ratio — weight: 15, type: numeric (minimum 2:1 for full points, 1.5:1 partial, below 1.5:1 zero)
  - Analyst Consensus — weight: 5, type: scale (all agree/majority/split/contrarian)
  - Timeframe Alignment — weight: 5, type: pass/fail (trade direction aligns with the trend on the traded timeframe)

**FR-005: Trade Evaluation / Scoring**
Description: User initiates a trade evaluation for an asset+direction+timeframe. The system scores each checklist factor and produces a composite score (0-100).
Priority: Must Have
Acceptance Criteria:
- GIVEN the user starts a trade evaluation for BTC long on the 4h timeframe WHEN they input or confirm values for each checklist factor THEN the system displays each factor's individual score, pass/fail status, and a composite score normalized to 0-100
- GIVEN a trade evaluation is complete WHEN the composite score is below 50 THEN the system displays a RED signal with "Low conviction — consider passing"
- GIVEN a trade evaluation is complete WHEN the composite score is 50-74 THEN the system displays a YELLOW signal with "Moderate conviction — proceed with caution"
- GIVEN a trade evaluation is complete WHEN the composite score is 75+ THEN the system displays a GREEN signal with "High conviction setup"
- GIVEN a completed evaluation WHEN the user clicks on any factor THEN they see the reasoning/detail behind that factor's score

### 6.3 Trade Recommendation

**FR-006: Recommendation Generation**
Description: After scoring, the system generates a structured trade recommendation with entry, stop, targets, vehicle suggestion, and position sizing.
Priority: Must Have
Acceptance Criteria:
- GIVEN a scored trade evaluation WHEN the recommendation is generated THEN it includes: asset, direction (long/short), conviction level (high/medium/low mapped from score), entry zone, stop loss, at least one take-profit target, and risk/reward ratio
- GIVEN entry and stop loss prices WHEN the recommendation is generated THEN position size is calculated as: (Account size × risk%) ÷ (entry - stop) for longs, adjusted for shorts
- GIVEN account risk is set to 1% WHEN a trade is evaluated with entry $100 and stop $95 THEN position size for the $92K account = ($920 ÷ $5) = 184 shares
- GIVEN a high-conviction trade (score 80+) WHEN the recommendation is generated THEN risk % is allowed up to 2% and this is noted in the recommendation

**FR-007: Vehicle Suggestion**
Description: The system suggests the most appropriate trade vehicle (shares, options, futures) based on the setup characteristics.
Priority: Must Have
Acceptance Criteria:
- GIVEN a swing trade (multi-day) with moderate conviction THEN the default suggestion is shares/spot
- GIVEN a high-conviction trade with a defined risk level and time horizon under 30 days THEN options are suggested as an alternative with reasoning (leverage, defined risk)
- GIVEN the target account is the IRA WHEN the trade is a short THEN the system flags "Not IRA-eligible: short selling not permitted in IRA" and suggests alternatives (e.g., buying puts if options are enabled)
- GIVEN the target account is the IRA WHEN the trade involves naked options or margin THEN the system flags "Not IRA-eligible" with the specific restriction

**FR-008: Confirmation Dashboard**
Description: A single-page summary view showing the complete recommendation for quick review and confirm/reject action.
Priority: Must Have
Acceptance Criteria:
- GIVEN a generated recommendation WHEN the dashboard is displayed THEN the trader can see: traffic light signal, composite score, asset+direction, entry/stop/targets, R:R, position size per account, vehicle suggestion, and all checklist factor scores — all without scrolling on a desktop display
- GIVEN the dashboard is displayed WHEN the trader clicks "Confirm" THEN the trade is logged as "taken" with a timestamp and the recommendation details are frozen
- GIVEN the dashboard is displayed WHEN the trader clicks "Pass" THEN the trade is logged as "passed" with an optional reason field

### 6.4 Analyst Tracking

**FR-009: Analyst Call Logging**
Description: User can log analyst calls with structured data: analyst name, asset, direction, conviction, reasoning summary, and date.
Priority: Must Have
Acceptance Criteria:
- GIVEN the analyst input form WHEN the user logs a call from "InvestAnswers" for "BTC" direction "bullish" conviction "high" with reasoning "expects breakout above 100K based on ETF flows" THEN the call is stored and reflected in the next trade evaluation for BTC
- GIVEN multiple analyst calls exist for an asset WHEN a trade evaluation runs THEN the "Analyst Consensus" factor reflects the balance of opinions (all bullish = full points for long, split = partial, all bearish = full points for short)
- GIVEN an analyst call is older than 30 days THEN it is marked as stale and weighted at 50% in consensus calculation

### 6.5 Risk Management

**FR-010: Account Configuration**
Description: User configures their trading accounts with name, type (taxable/IRA), balance, and default risk percentage.
Priority: Must Have
Acceptance Criteria:
- GIVEN the settings page WHEN the user adds an account "Taxable" with type "taxable", balance $92,000, and default risk 1% THEN the account is available for position sizing calculations
- GIVEN the settings page WHEN the user adds an account "IRA" with type "IRA", balance $250,000, and default risk 1% THEN the account is available and IRA restrictions are enforced on recommendations
- GIVEN an account balance WHEN the user updates it THEN all future position sizing uses the new balance

**FR-011: Portfolio Risk Tracking**
Description: The system tracks total open risk across all active trades and warns when limits are approached.
Priority: Should Have
Acceptance Criteria:
- GIVEN 3 open trades each risking 1% WHEN the user views the portfolio dashboard THEN total open risk shows 3% of account
- GIVEN total open risk is at 5% WHEN the user initiates a new trade evaluation THEN the system displays a warning: "Approaching max portfolio risk (5%/6%). Consider smaller size or closing existing positions."
- GIVEN total open risk exceeds 6% THEN the system blocks new recommendations until risk is reduced, displaying "Max portfolio risk exceeded"

**FR-012: Correlated Exposure Tracking**
Description: The system groups open trades by asset class and flags correlated exposure.
Priority: Should Have
Acceptance Criteria:
- GIVEN the user is long BTC and long SOL WHEN viewing portfolio risk THEN correlated crypto exposure is displayed as a combined figure
- GIVEN correlated exposure in one asset class exceeds 3% THEN the system warns "High correlated exposure in crypto: 3.5%. Consider diversifying."

### 6.6 Trade Journal

**FR-013: Trade Outcome Logging**
Description: User logs the outcome of confirmed trades: actual entry, actual exit, P&L, and notes.
Priority: Must Have
Acceptance Criteria:
- GIVEN a confirmed trade exists WHEN the user logs the outcome with actual entry $100, actual exit $112, P&L +$2,208 THEN the outcome is linked to the original recommendation and the system can compare recommended vs. actual
- GIVEN a logged outcome WHEN viewing the trade history THEN the user sees: recommendation score, recommended entry/stop/target, actual entry/exit, P&L, and whether the system's recommendation was followed
- GIVEN no outcome is logged for a confirmed trade after 30 days THEN the system prompts the user to log the result

**FR-014: Performance Analytics**
Description: The system calculates aggregate performance statistics from the trade journal.
Priority: Must Have
Acceptance Criteria:
- GIVEN at least 10 completed trades WHEN viewing analytics THEN the user sees: total P&L, win rate, average win, average loss, profit factor, expectancy, and breakdown by asset class
- GIVEN at least 20 completed trades WHEN viewing analytics THEN the user sees which checklist factors had the highest correlation with winning trades vs. losing trades
- GIVEN performance data exists WHEN viewing analytics THEN the user sees a recommendation accuracy metric: "System recommended X trades, Y were profitable (Z%)"

### 6.7 TradingView Integration

**FR-015: TradingView Alert Webhook Receiver**
Description: The system exposes a webhook endpoint that receives alerts from TradingView containing indicator data.
Priority: Should Have
Acceptance Criteria:
- GIVEN TradingView is configured to send alerts to the system's webhook URL WHEN an alert fires for "BTC RSI crossed above 70 on 4h" THEN the system receives and stores the indicator event, associating it with the correct asset and timeframe
- GIVEN a webhook payload with fields {ticker, indicator, value, timeframe, timestamp} WHEN received THEN the data is parsed and available for the next trade evaluation
- GIVEN a malformed webhook payload WHEN received THEN the system logs the error and returns HTTP 400 without crashing

## 7. Non-Functional Requirements

**NFR-001: Response Time**
Description: The dashboard and scoring engine must be fast enough for active trading.
Target: Trade evaluation scoring completes in under 2 seconds. Dashboard renders in under 1 second.
How to Verify: Time the evaluation flow end-to-end in browser dev tools.

**NFR-002: Data Persistence**
Description: All trade data, recommendations, and journal entries must be reliably persisted.
Target: Zero data loss. All writes confirmed before UI reflects success.
How to Verify: Kill the server mid-write, verify data integrity on restart.

**NFR-003: Single-User Security (MVP)**
Description: MVP is single-user, local/self-hosted. No authentication required for v1, but data should not be publicly accessible.
Target: App binds to localhost only by default.
How to Verify: Attempt to access from another machine on the network; connection refused.

## 8. Data Model (High-Level)

### Entities
- **Account** — id, name, type (taxable/IRA), balance, default_risk_pct
- **Asset** — id, ticker, name, asset_class (equity/crypto/commodity), exchange, active
- **Level** — id, asset_id, price, label, type (fibonacci/manual/pivot), active, created_at
- **ChecklistFactor** — id, name, description, weight, score_type (pass_fail/scale/numeric), config_json
- **TradeEvaluation** — id, asset_id, direction (long/short), timeframe, composite_score, signal (green/yellow/red), status (pending/confirmed/passed), created_at
- **FactorScore** — id, evaluation_id, factor_id, raw_value, normalized_score, reasoning
- **Recommendation** — id, evaluation_id, account_id, entry_price, stop_loss, targets_json, rr_ratio, position_size, vehicle, vehicle_reasoning, ira_eligible
- **AnalystCall** — id, asset_id, analyst_name, direction, conviction, reasoning, call_date, stale
- **TradeOutcome** — id, evaluation_id, actual_entry, actual_exit, pnl, notes, closed_at
- **WebhookEvent** — id, asset_id, source, indicator, value, timeframe, received_at

### Key Relationships
- Asset → many Levels, AnalystCalls, TradeEvaluations, WebhookEvents
- TradeEvaluation → many FactorScores, one Recommendation, one TradeOutcome
- ChecklistFactor → many FactorScores

## 9. API Contract

RESTful JSON API. Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/assets | List/create assets |
| GET/PUT/DELETE | /api/assets/:id | Get/update/archive asset |
| GET/POST | /api/assets/:id/levels | List/create S/R levels |
| GET/POST | /api/checklist | List/create checklist factors |
| PUT/DELETE | /api/checklist/:id | Update/delete factor |
| POST | /api/evaluations | Start a new trade evaluation |
| GET | /api/evaluations/:id | Get evaluation with scores and recommendation |
| PUT | /api/evaluations/:id/confirm | Confirm trade |
| PUT | /api/evaluations/:id/pass | Pass on trade |
| POST | /api/evaluations/:id/outcome | Log trade outcome |
| GET/POST | /api/analyst-calls | List/create analyst calls |
| GET/POST | /api/accounts | List/create accounts |
| PUT | /api/accounts/:id | Update account (balance, risk %) |
| GET | /api/analytics | Performance analytics |
| GET | /api/portfolio-risk | Current open risk summary |
| POST | /api/webhooks/tradingview | TradingView alert receiver |

## 10. Scope & Constraints

### In Scope (MVP — v0.1)
- Asset and S/R level management
- Pre-configured checklist with editable weights
- Manual trade evaluation with scoring
- Recommendation generation with position sizing
- Confirmation dashboard
- Analyst call logging (manual)
- Trade journal with outcome logging
- Basic performance analytics
- Two account support (taxable + IRA) with IRA restriction flagging

### Out of Scope (v0.1)
- TradingView webhook integration (v0.2)
- Portfolio-level risk tracking (v0.2)
- On-chain data integration (v0.3)
- Automated analyst content ingestion (v0.3)
- Weight auto-adjustment based on performance (v0.3)
- Mobile app (v0.2 — responsive web)
- Broker integration (blocked — Fidelity has no API)
- Real-time streaming data

### Constraints
- Fidelity has no public API — all trade execution is manual
- On-chain data APIs (Glassnode, CryptoQuant) have rate-limited free tiers
- YouTube/X content ingestion has TOS and rate-limit concerns
- Personal tool — commercialization is not in scope

## 11. Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data entry fatigue — manual input of analyst calls and TA becomes tedious | High | Medium | Design fast-input forms; prioritize TradingView webhook integration in v0.2 |
| Checklist weights are wrong initially | High | Low | System tracks factor predictiveness; suggest adjustments after 30+ trades |
| Overfitting to historical patterns | Medium | High | Keep minimum 30-trade sample before suggesting weight changes; display confidence intervals |
| TradingView webhook reliability | Low | Medium | Store events idempotently; manual fallback always available |

## 12. Open Questions

- [Non-blocking] Should the system support multiple watchlists or groupings of assets?
- [Non-blocking] What specific options strategies should the vehicle suggestion engine recommend beyond basic calls/puts? (Spreads, iron condors, etc.)
- [Non-blocking] Should drawdown circuit breakers be advisory (warning) or enforced (blocks recommendations)?
