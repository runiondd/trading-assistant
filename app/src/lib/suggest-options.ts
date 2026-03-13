/**
 * Options contract scoring engine — pure function, no API calls.
 * Takes contracts + trade context, returns top 3 ranked picks.
 */

import type { OptionContract } from "./unusual-whales";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeContext {
  direction: "long" | "short";
  entry: number;
  stop: number;
  target: number;
  atr: number | null;
  timeframe: string;
  riskAmount: number;
}

export interface OptionsRecommendation {
  contract: OptionContract & { midPrice: number; daysToExpiration: number };
  score: number;
  reasons: string[];
  breakeven: number;
  maxRisk: number;
  suggestedQty: number;
  scoreBreakdown: {
    strikeProximity: number;
    riskReward: number;
    liquidity: number;
    dteSweetSpot: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeMidPrice(bid: number, ask: number): number {
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (bid > 0) return bid;
  if (ask > 0) return ask;
  return 0;
}

function computeDTE(expiration: string): number {
  const exp = new Date(expiration);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Scoring functions (each returns 0-1, scaled by weight in main function)
// ---------------------------------------------------------------------------

function scoreStrikeProximity(strike: number, entry: number, atr: number | null): number {
  const distance = Math.abs(strike - entry);
  const reference = atr ?? entry * 0.02; // fallback: 2% of entry
  if (reference === 0) return 0.5;
  const ratio = distance / reference;
  // ATM (ratio ~0) = 1.0, 1 ATR away = 0.5, 2+ ATR away = near 0
  return Math.max(0, 1 - ratio * 0.5);
}

function scoreRiskReward(strike: number, target: number, midPrice: number): number {
  if (midPrice <= 0) return 0;
  const potentialMove = Math.abs(target - strike);
  // Per-contract premium is midPrice * 100
  const ratio = potentialMove / midPrice;
  // ratio of 5+ = perfect, 0 = terrible
  return Math.min(1, ratio / 5);
}

function scoreLiquidity(bid: number, ask: number, volume: number): number {
  let spreadScore = 0;
  if (bid > 0 && ask > 0) {
    const mid = (bid + ask) / 2;
    const spreadPct = (ask - bid) / mid;
    // < 5% spread = excellent, > 30% = poor
    spreadScore = Math.max(0, 1 - spreadPct / 0.3);
  }

  // Volume: 100+ = good, 1000+ = excellent
  const volumeScore = Math.min(1, Math.log10(Math.max(1, volume)) / 3);

  return spreadScore * 0.6 + volumeScore * 0.4;
}

function scoreDTE(dte: number, timeframe: string): number {
  const isIntraday = timeframe === "1h" || timeframe === "4h";
  const idealMin = isIntraday ? 14 : 30;
  const idealMax = isIntraday ? 21 : 45;

  if (dte >= idealMin && dte <= idealMax) return 1;
  if (dte < idealMin) return Math.max(0, dte / idealMin);
  // past ideal max, decay slowly
  return Math.max(0, 1 - (dte - idealMax) / 30);
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

export function suggestOptions(
  contracts: OptionContract[],
  ctx: TradeContext,
): OptionsRecommendation[] {
  const wantType = ctx.direction === "long" ? "call" : "put";

  // Enrich and filter
  const enriched = contracts
    .map((c) => ({
      ...c,
      midPrice: computeMidPrice(c.bid, c.ask),
      daysToExpiration: computeDTE(c.expiration),
    }))
    .filter((c) => {
      if (c.type !== wantType) return false;
      if (c.bid <= 0 && c.ask <= 0) return false; // zero-bid
      if (c.volume <= 0) return false; // zero-volume
      if (c.daysToExpiration < 14 || c.daysToExpiration > 60) return false;
      if (c.midPrice <= 0) return false;
      return true;
    });

  if (enriched.length === 0) return [];

  // Score each contract
  const scored = enriched.map((c) => {
    const strikeProximity = scoreStrikeProximity(c.strike, ctx.entry, ctx.atr);
    const riskReward = scoreRiskReward(c.strike, ctx.target, c.midPrice);
    const liquidity = scoreLiquidity(c.bid, c.ask, c.volume);
    const dteSweetSpot = scoreDTE(c.daysToExpiration, ctx.timeframe);

    const score =
      strikeProximity * 30 +
      riskReward * 25 +
      liquidity * 25 +
      dteSweetSpot * 20;

    // Build reasons
    const reasons: string[] = [];
    if (strikeProximity >= 0.8) reasons.push("Strike near entry (ATM)");
    else if (strikeProximity >= 0.5) reasons.push("Strike within 1 ATR of entry");
    else reasons.push("Strike far from entry — higher risk");

    if (riskReward >= 0.6) reasons.push("Strong risk/reward ratio");
    else if (riskReward >= 0.3) reasons.push("Moderate risk/reward");

    if (liquidity >= 0.7) reasons.push("Good liquidity — tight spread");
    else if (liquidity < 0.3) reasons.push("Wide spread — watch slippage");

    if (dteSweetSpot >= 0.8) reasons.push("Ideal DTE for timeframe");
    else if (dteSweetSpot < 0.5) reasons.push("DTE outside ideal range");

    if (c.impliedVolatility > 0 && c.impliedVolatility < 0.3) reasons.push("Low IV — cheaper premiums");
    if (c.impliedVolatility > 0.6) reasons.push("High IV — expensive premiums");

    // Breakeven
    const breakeven = ctx.direction === "long"
      ? c.strike + c.midPrice
      : c.strike - c.midPrice;

    // Max risk per contract = premium * 100
    const maxRiskPerContract = c.midPrice * 100;

    // Suggested qty based on risk budget
    const suggestedQty = maxRiskPerContract > 0
      ? Math.max(1, Math.floor(ctx.riskAmount / maxRiskPerContract))
      : 1;

    return {
      contract: c,
      score: Math.round(score * 10) / 10,
      reasons,
      breakeven: Math.round(breakeven * 100) / 100,
      maxRisk: Math.round(maxRiskPerContract * 100) / 100,
      suggestedQty,
      scoreBreakdown: {
        strikeProximity: Math.round(strikeProximity * 30 * 10) / 10,
        riskReward: Math.round(riskReward * 25 * 10) / 10,
        liquidity: Math.round(liquidity * 25 * 10) / 10,
        dteSweetSpot: Math.round(dteSweetSpot * 20 * 10) / 10,
      },
    };
  });

  // Sort by score descending, return top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
