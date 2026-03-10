import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () => text().notNull().default(sql`(datetime('now'))`);

// ── accounts ──────────────────────────────────────────────────────────
export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  accountType: text("account_type").notNull(), // "taxable" | "ira" | "roth"
  balance: real("balance").notNull(),
  defaultRiskPct: real("default_risk_pct").notNull().default(1.0),
  plaidAccountId: text("plaid_account_id"),
  plaidAccessToken: text("plaid_access_token"),
  balanceUpdatedAt: text("balance_updated_at"),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

// ── assets ────────────────────────────────────────────────────────────
export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  assetClass: text("asset_class").notNull(), // "crypto" | "equity" | "commodity"
  exchange: text("exchange"),
  active: integer("active").notNull().default(1),
  createdAt: timestamp(),
});

// ── levels ────────────────────────────────────────────────────────────
export const levels = sqliteTable(
  "levels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id),
    price: real("price").notNull(),
    label: text("label").notNull(),
    levelType: text("level_type").notNull(), // "fibonacci" | "manual" | "pivot"
    active: integer("active").notNull().default(1),
    createdAt: timestamp(),
  },
  (table) => [index("idx_levels_asset_id").on(table.assetId)]
);

// ── checklist_factors ─────────────────────────────────────────────────
export const checklistFactors = sqliteTable("checklist_factors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  weight: integer("weight").notNull(),
  scoreType: text("score_type").notNull(), // "pass_fail" | "scale" | "numeric"
  configJson: text("config_json"),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

// ── trade_evaluations ─────────────────────────────────────────────────
export const tradeEvaluations = sqliteTable(
  "trade_evaluations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    direction: text("direction").notNull(), // "long" | "short"
    timeframe: text("timeframe").notNull(), // "Weekly" | "Daily" | "4h" | "1h"
    entryPrice: real("entry_price").notNull(),
    stopLoss: real("stop_loss").notNull(),
    targetsJson: text("targets_json").notNull(), // JSON array of target prices
    compositeScore: real("composite_score"),
    signal: text("signal"), // "green" | "yellow" | "red"
    status: text("status").notNull().default("pending"),
    rrRatio: real("rr_ratio"),
    positionSize: real("position_size"),
    positionCost: real("position_cost"),
    vehicle: text("vehicle").default("shares"),
    iraEligible: integer("ira_eligible").default(1),
    confirmedAt: text("confirmed_at"),
    passedAt: text("passed_at"),
    passReason: text("pass_reason"),
    overridesJson: text("overrides_json"), // JSON: { factorId: { suggested, chosen } }
    createdAt: timestamp(),
  },
  (table) => [
    index("idx_evaluations_asset_id").on(table.assetId),
    index("idx_evaluations_status").on(table.status),
  ]
);

// ── factor_scores ─────────────────────────────────────────────────────
export const factorScores = sqliteTable(
  "factor_scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    evaluationId: integer("evaluation_id")
      .notNull()
      .references(() => tradeEvaluations.id),
    factorId: integer("factor_id")
      .notNull()
      .references(() => checklistFactors.id),
    rawValue: text("raw_value").notNull(),
    normalizedScore: real("normalized_score").notNull(),
    maxScore: real("max_score").notNull(),
  },
  (table) => [index("idx_factor_scores_evaluation_id").on(table.evaluationId)]
);

// ── trade_outcomes ────────────────────────────────────────────────────
export const tradeOutcomes = sqliteTable("trade_outcomes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  evaluationId: integer("evaluation_id")
    .notNull()
    .unique()
    .references(() => tradeEvaluations.id),
  actualEntry: real("actual_entry").notNull(),
  actualExit: real("actual_exit").notNull(),
  pnl: real("pnl").notNull(),
  notes: text("notes"),
  closedAt: text("closed_at").notNull(),
  createdAt: timestamp(),
});

// ── saved_factor_values ─────────────────────────────────────────────
export const savedFactorValues = sqliteTable(
  "saved_factor_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => assets.id),
    factorId: integer("factor_id")
      .notNull()
      .references(() => checklistFactors.id),
    value: text("value").notNull(),
    updatedAt: timestamp(),
  },
  (table) => [
    uniqueIndex("idx_saved_factor_asset_factor").on(table.assetId, table.factorId),
  ]
);
