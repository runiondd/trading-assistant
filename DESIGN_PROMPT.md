# Trading Helper — Project Kickoff Prompt

Copy everything below the line into a new Claude conversation (or Cowork session) with the `project-kickoff` skill active. This will generate your `prd.md`.

---

I'm building **Trading Helper** — a decision-support system that synthesizes data and analysis from multiple sources into scored, actionable trade recommendations that I review and confirm before executing. The goal is to trade for a living, and if the system proves to give an edge, to commercialize it as a paid service for other traders.

## The Problem

I trade stocks, crypto (primarily BTC and SOL), and precious metals/commodities. I take both long and short positions using shares/spot, options, and futures. I follow multiple analysts, maintain my own charts and technical analysis, and have a personal checklist I run through before every trade.

The problem: **synthesizing all of this is manual, slow, and error-prone under pressure.** I'm looking at different analyst opinions, my own TA, macro context, market structure data, and trying to mentally score whether a trade meets my criteria. By the time I've processed everything, the opportunity has sometimes passed — or I skip checklist items and take trades I shouldn't.

## Who Uses This

**Primary user: Me** — an active trader who wants a system to consolidate analysis and enforce my own trading discipline.

**Future users: Other active traders** who want a structured decision framework with multi-source synthesis. They'd bring their own checklists, analysts, and criteria.

## What I Need the System to Do

### 1. Ingest and normalize data from multiple sources
- My own technical analysis (key levels, indicators, chart patterns, trend direction)
- External analyst calls and sentiment (bullish/bearish/neutral with reasoning)
- Fundamental data: earnings, on-chain metrics for crypto, supply/demand for commodities
- Market structure: volume profile, order flow, open interest, options flow/gamma levels
- Macro context: Fed policy stance, DXY, yields, VIX, risk-on/risk-off regime

### 2. Run my personal trade checklist automatically
- I have a checklist of criteria I check before entering a trade (trend alignment, key level proximity, risk/reward minimum, confirmation signals, etc.)
- Codify these into scored, weighted factors
- Each potential trade gets a composite score (0-100)
- Show me which items pass/fail with reasoning — not just a number

### 3. Generate a structured trade recommendation
- Asset/ticker, direction (long/short), conviction level (high/medium/low)
- Recommended vehicle: shares, calls/puts, spreads, futures — with reasoning for why that vehicle
- Entry zone, stop loss, take-profit targets (multiple targets if scaling out)
- Risk/reward ratio and position sizing suggestion based on my account size and risk tolerance
- Time horizon: scalp, day trade, swing, position trade
- Key risks and what would invalidate the thesis

### 4. Present a confirmation dashboard
- One-page summary I can scan in under 60 seconds
- Traffic light signal (green/yellow/red) with drill-down into each factor
- Historical accuracy tracking: how has the system performed on similar setups?
- I confirm or reject — no auto-execution, ever

### 5. Learn and improve over time
- Trade journal: log what I actually did and the outcome vs. what the system recommended
- Track which checklist factors are most predictive of winners vs. losers
- Surface patterns (e.g., "your win rate drops when VIX is above 25 and you're trading options")
- Suggest weight adjustments based on actual performance data

## Constraints and Preferences

- **No auto-execution** — I always confirm before trading
- **Multi-asset class** — must handle equities, crypto, and commodities (different data sources and rhythms for each)
- **Desktop-first, mobile-friendly** — I trade from a desk but want to check on mobile
- **MVP first** — start with the core checklist scoring and recommendation engine; add sophistication iteratively
- **Commercializable** — architect it so other traders could use it with their own checklists and data sources. This means user accounts, configurable checklists, and data source plugins eventually.
- **Data cost awareness** — some market data feeds are expensive. The MVP should work with free/cheap data sources and support upgrading to premium feeds later.

## What I Don't Want

- A fully automated trading bot
- A system that makes me dependent on it — it should enforce MY process, not replace my judgment
- Over-engineered v1 — I'd rather have a working checklist scorer in a week than a perfect platform in 6 months

## Open Questions for the PRD Process

- What's the best way to input my own TA? (manual entry, screenshot parsing, TradingView webhook, broker API?)
- How should analyst opinions be captured? (RSS, manual entry, API from specific platforms?)
- What's the right tech stack for real-time-ish data + a dashboard + future multi-tenancy?
- How to handle the different data availability across asset classes (e.g., on-chain data exists for crypto but not stocks)?
- What are the compliance/regulatory considerations if I commercialize trade recommendations?

Please interview me to fill in any gaps, then produce the full PRD.
