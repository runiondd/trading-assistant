// ── Database row types (inferred from Drizzle schema) ─────────────────
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type {
  accounts,
  assets,
  levels,
  checklistFactors,
  tradeEvaluations,
  factorScores,
  tradeOutcomes,
} from "@/db/schema";

export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Asset = InferSelectModel<typeof assets>;
export type NewAsset = InferInsertModel<typeof assets>;

export type Level = InferSelectModel<typeof levels>;
export type NewLevel = InferInsertModel<typeof levels>;

export type ChecklistFactor = InferSelectModel<typeof checklistFactors>;
export type NewChecklistFactor = InferInsertModel<typeof checklistFactors>;

export type TradeEvaluation = InferSelectModel<typeof tradeEvaluations>;
export type NewTradeEvaluation = InferInsertModel<typeof tradeEvaluations>;

export type FactorScore = InferSelectModel<typeof factorScores>;
export type NewFactorScore = InferInsertModel<typeof factorScores>;

export type TradeOutcome = InferSelectModel<typeof tradeOutcomes>;
export type NewTradeOutcome = InferInsertModel<typeof tradeOutcomes>;

// ── Enums ─────────────────────────────────────────────────────────────
export type AccountType = "taxable" | "ira" | "roth";
export type AssetClass = "crypto" | "equity" | "commodity";
export type Direction = "long" | "short";
export type Timeframe = "Weekly" | "Daily" | "4h" | "1h";
export type ScoreType = "pass_fail" | "scale" | "numeric";
export type Signal = "green" | "yellow" | "red";
export type EvaluationStatus = "pending" | "confirmed" | "passed";
export type LevelType = "fibonacci" | "manual" | "pivot";
export type Vehicle = "shares" | "options" | "futures";

// ── API request/response shapes ───────────────────────────────────────
export interface EvaluationRequest {
  assetId: number;
  accountId: number;
  direction: Direction;
  timeframe: Timeframe;
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  factorValues: Record<number, string>; // factorId -> raw value
}

export interface EvaluationResult {
  evaluation: TradeEvaluation;
  factorScores: (FactorScore & { factorName: string; factorWeight: number })[];
  compositeScore: number;
  signal: Signal;
  positionSize: number;
  positionCost: number;
  rrRatio: number;
}

export interface PositionSizeInput {
  balance: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  direction: Direction;
}

export interface PositionSizeResult {
  riskAmount: number;
  shares: number;
  positionCost: number;
  riskPerShare: number;
}
