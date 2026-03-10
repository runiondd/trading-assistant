import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "trading-helper.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function seed() {
  console.log("Seeding database...");

  // ── Accounts ──
  db.insert(schema.accounts)
    .values([
      { name: "Taxable Brokerage", accountType: "taxable", balance: 92000 },
      { name: "IRA", accountType: "ira", balance: 250000 },
    ])
    .run();
  console.log("  ✓ 2 accounts");

  // ── Assets ──
  db.insert(schema.assets)
    .values([
      { ticker: "BTC", name: "Bitcoin", assetClass: "crypto", exchange: "Binance" },
      { ticker: "SOL", name: "Solana", assetClass: "crypto", exchange: "Binance" },
      { ticker: "AAPL", name: "Apple", assetClass: "equity", exchange: "NASDAQ" },
      { ticker: "GLD", name: "SPDR Gold Trust", assetClass: "commodity", exchange: "AMEX" },
      { ticker: "SLV", name: "iShares Silver Trust", assetClass: "commodity", exchange: "AMEX" },
      { ticker: "SPY", name: "S&P 500 ETF", assetClass: "equity", exchange: "AMEX" },
      { ticker: "QQQ", name: "Nasdaq 100 ETF", assetClass: "equity", exchange: "NASDAQ" },
    ])
    .run();
  console.log("  ✓ 7 assets");

  // ── BTC Support/Resistance Levels ──
  db.insert(schema.levels)
    .values([
      { assetId: 1, price: 109000, label: "All-Time High", levelType: "manual" },
      { assetId: 1, price: 100000, label: "Psychological Round", levelType: "manual" },
      { assetId: 1, price: 92000, label: "Major Support", levelType: "manual" },
      { assetId: 1, price: 85000, label: "Fib 38.2%", levelType: "fibonacci" },
      { assetId: 1, price: 78000, label: "Fib 50%", levelType: "fibonacci" },
      { assetId: 1, price: 73000, label: "Fib 61.8%", levelType: "fibonacci" },
      { assetId: 1, price: 69000, label: "Previous ATH / Major Support", levelType: "manual" },
    ])
    .run();
  console.log("  ✓ 7 BTC levels");

  // ── Checklist Factors (9 default) ──
  db.insert(schema.checklistFactors)
    .values([
      {
        name: "Trend Alignment",
        description: "Is the trade direction aligned with the trend on the chosen timeframe?",
        weight: 15,
        scoreType: "scale",
        configJson: JSON.stringify({ options: ["Against", "Neutral", "Aligned", "Strong"] }),
        sortOrder: 1,
      },
      {
        name: "RSI Condition",
        description: "RSI position relative to overbought/oversold thresholds for the timeframe.",
        weight: 10,
        scoreType: "scale",
        configJson: JSON.stringify({
          options: ["Overbought", "Neutral", "Oversold", "Confirming"],
          scoreMap: {
            long:  { "Overbought": 0, "Neutral": 0.33, "Oversold": 0.67, "Confirming": 1 },
            short: { "Oversold": 0, "Neutral": 0.33, "Overbought": 0.67, "Confirming": 1 },
          },
        }),
        sortOrder: 2,
      },
      {
        name: "Mean Reversion",
        description: "Price position relative to Bollinger Bands / VWAP / moving averages.",
        weight: 10,
        scoreType: "scale",
        configJson: JSON.stringify({ options: ["Extended", "Neutral", "Reverting", "At Mean"] }),
        sortOrder: 3,
      },
      {
        name: "Support/Resistance Proximity",
        description: "How close is entry to a key support (long) or resistance (short) level?",
        weight: 15,
        scoreType: "scale",
        configJson: JSON.stringify({ options: ["Far", "Moderate", "Near", "At Level"] }),
        sortOrder: 4,
      },
      {
        name: "Risk:Reward Ratio",
        description: "Is the R:R >= 2:1?",
        weight: 15,
        scoreType: "pass_fail",
        configJson: null,
        sortOrder: 5,
      },
      {
        name: "Analyst Consensus",
        description: "Do your followed analysts agree on direction?",
        weight: 10,
        scoreType: "scale",
        configJson: JSON.stringify({ options: ["Disagree", "Mixed", "Mostly Agree", "Unanimous"] }),
        sortOrder: 6,
      },
      {
        name: "Volume Confirmation",
        description: "Is volume supporting the move?",
        weight: 10,
        scoreType: "pass_fail",
        configJson: null,
        sortOrder: 7,
      },
      {
        name: "Multi-Timeframe Agreement",
        description: "Do higher timeframes confirm the trade direction?",
        weight: 10,
        scoreType: "scale",
        configJson: JSON.stringify({ options: ["Conflicting", "Neutral", "Mostly Aligned", "All Aligned"] }),
        sortOrder: 8,
      },
      {
        name: "IRA Eligibility",
        description: "Is this trade strategy allowed in the selected account?",
        weight: 5,
        scoreType: "pass_fail",
        configJson: null,
        sortOrder: 9,
      },
    ])
    .run();
  console.log("  ✓ 9 checklist factors");

  console.log("Seed complete.");
  sqlite.close();
}

seed();
