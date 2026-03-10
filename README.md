# Trading Helper

> A personal trade decision-support system that scores potential trades against a configurable 9-factor checklist, generates position-sized recommendations, and maintains a trade journal with override tracking.

## Status

**Phase 3: Build** — Core features implemented, testing in progress.

### What's Working
- Asset management with S/R levels (manual + Fibonacci calculator)
- 9-factor checklist scoring with configurable weights
- **Auto-populated indicators** from locally-computed technical analysis (RSI, EMA, Bollinger Bands, Keltner Channels, ATR, volume, squeeze detection)
- Multi-timeframe analysis (Weekly, Daily, 4h, 1h) from free public data (Binance US, Yahoo Finance)
- Override tracking — system suggestions recorded, user changes detected and persisted
- Position sizing based on account balance and risk percentage
- TradingView chart integration with BB + Keltner Channel overlays
- Trade journal with override history
- Plaid integration for brokerage account balances

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Frontend | React 19 + Tailwind CSS 4 |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Indicators | Local computation from free OHLCV data |
| Charts | TradingView Advanced Chart (iframe embed) |
| Brokerage | Plaid SDK (read-only balances) |
| Testing | Vitest |

## Quick Start

```bash
cd app
npm install
npx drizzle-kit push     # apply database schema
npm run dev               # starts on http://localhost:3001
```

### Environment Variables

Create `app/.env.local`:
```env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox
```

No indicator API keys needed — all technical analysis is computed locally from free public price data.

## Testing

```bash
cd app
npm test          # run all tests once
npm run test:watch  # watch mode
```

## Project Documents

| Document | Description |
|----------|-------------|
| [PRD](prd.md) | Product requirements and acceptance criteria |
| [Architecture](architecture.md) | Technical design and system architecture |
| [Tasks](tasks.md) | Ordered build task breakdown |
