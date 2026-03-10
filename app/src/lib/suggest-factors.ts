/**
 * Maps computed technical indicators to checklist factor suggestions.
 * Covers all 8 automatable factors (Analyst Consensus is manual).
 */

export interface IndicatorSet {
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  bb: { upper: number; middle: number; lower: number } | null;
  kc: { upper: number; middle: number; lower: number } | null;
  volumeAvg20: number | null;
  lastVolume: number | null;
  lastClose: number | null;
  squeeze: boolean;
}

export interface SuggestionContext {
  entryPrice: number;
  direction: "long" | "short";
  timeframe: string;
  levels: { price: number; label: string }[];
  accountType: string;
  rrRatio: number;
  indicators: IndicatorSet;
  indicatorsByTimeframe: Record<string, IndicatorSet>;
}

export interface FactorSuggestion {
  value: string;
  reason: string;
}

// ── Individual factor suggesters ──

function suggestTrend(ctx: SuggestionContext): FactorSuggestion | null {
  const { ema20, ema50 } = ctx.indicators;
  if (ema20 === null || ema50 === null) return null;

  const diff = ema20 - ema50;
  const pctDiff = (diff / ema50) * 100;
  const absPct = Math.abs(pctDiff);

  // Determine raw alignment (positive = bullish, negative = bearish)
  let rawLabel: string;
  if (absPct > 1) {
    rawLabel = diff > 0 ? "Strong" : "Against";
  } else if (absPct <= 0.5) {
    rawLabel = "Neutral";
  } else {
    rawLabel = diff > 0 ? "Aligned" : "Against";
  }

  // For shorts, reverse: bullish EMAs are bad for shorts
  let value: string;
  if (ctx.direction === "short") {
    const reverseMap: Record<string, string> = {
      Strong: "Against",
      Aligned: "Against",
      Neutral: "Neutral",
      Against: "Aligned",
    };
    // If raw says strong bearish (diff < 0, absPct > 1), that's "Strong" for short
    if (diff < 0 && absPct > 1) {
      value = "Strong";
    } else if (diff < 0) {
      value = "Aligned";
    } else {
      value = reverseMap[rawLabel] ?? rawLabel;
    }
  } else {
    value = rawLabel;
  }

  return {
    value,
    reason: `EMA(20)=${ema20.toFixed(2)}, EMA(50)=${ema50.toFixed(2)} (${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(2)}%)`,
  };
}

function suggestRsi(ctx: SuggestionContext): FactorSuggestion | null {
  const { rsi } = ctx.indicators;
  if (rsi === null) return null;

  const isHigherTF = ctx.timeframe === "Weekly" || ctx.timeframe === "Daily";
  const obThreshold = isHigherTF ? 70 : 80;
  const osThreshold = isHigherTF ? 30 : 20;

  if (rsi >= obThreshold) {
    return {
      value: "Overbought",
      reason: `RSI is ${rsi.toFixed(1)} (>${obThreshold})`,
    };
  } else if (rsi <= osThreshold) {
    return {
      value: "Oversold",
      reason: `RSI is ${rsi.toFixed(1)} (<${osThreshold})`,
    };
  } else if (
    (ctx.direction === "long" && rsi > 50 && rsi < obThreshold) ||
    (ctx.direction === "short" && rsi < 50 && rsi > osThreshold)
  ) {
    return {
      value: "Confirming",
      reason: `RSI is ${rsi.toFixed(1)}, confirming ${ctx.direction} direction`,
    };
  } else {
    return {
      value: "Neutral",
      reason: `RSI is ${rsi.toFixed(1)}`,
    };
  }
}

function suggestMeanReversion(ctx: SuggestionContext): FactorSuggestion | null {
  const { bb, kc, squeeze, lastClose } = ctx.indicators;
  if (bb === null) return null;

  const price = lastClose ?? ctx.entryPrice;
  if (price <= 0) return null;

  // Squeeze + price near middle → At Mean
  if (squeeze && kc !== null) {
    const distToMiddle = Math.abs(price - bb.middle) / bb.middle;
    if (distToMiddle < 0.01) {
      return {
        value: "At Mean",
        reason: `Squeeze detected, price near BB middle ($${bb.middle.toFixed(2)})`,
      };
    }
  }

  // Price at or beyond bands → Extended
  if (price >= bb.upper) {
    return {
      value: "Extended",
      reason: `Price ($${price.toFixed(2)}) at/above upper BB ($${bb.upper.toFixed(2)})`,
    };
  }
  if (price <= bb.lower) {
    return {
      value: "Extended",
      reason: `Price ($${price.toFixed(2)}) at/below lower BB ($${bb.lower.toFixed(2)})`,
    };
  }

  // Price near middle → At Mean (even without squeeze)
  if (Math.abs(price - bb.middle) / bb.middle < 0.01) {
    return {
      value: "At Mean",
      reason: `Price near BB middle ($${bb.middle.toFixed(2)})`,
    };
  }

  // Price between middle and band, moving toward middle → Reverting
  if (
    (ctx.direction === "long" && price < bb.middle) ||
    (ctx.direction === "short" && price > bb.middle)
  ) {
    return {
      value: "Reverting",
      reason: `Price moving toward BB mean ($${bb.middle.toFixed(2)})`,
    };
  }

  return {
    value: "Neutral",
    reason: "Price within Bollinger Bands",
  };
}

function suggestSrProximity(ctx: SuggestionContext): FactorSuggestion | null {
  if (ctx.levels.length === 0) return null;

  const entry = ctx.entryPrice;
  let nearest: { price: number; label: string } | null = null;
  let minDist = Infinity;

  for (const level of ctx.levels) {
    if (ctx.direction === "long" && level.price < entry) {
      // Support levels are below entry for longs
      const dist = entry - level.price;
      if (dist < minDist) {
        minDist = dist;
        nearest = level;
      }
    } else if (ctx.direction === "short" && level.price > entry) {
      // Resistance levels are above entry for shorts
      const dist = level.price - entry;
      if (dist < minDist) {
        minDist = dist;
        nearest = level;
      }
    }
  }

  if (nearest === null) return null;

  const distPct = (Math.abs(entry - nearest.price) / entry) * 100;

  let value: string;
  if (distPct < 0.5) {
    value = "At Level";
  } else if (distPct < 2) {
    value = "Near";
  } else if (distPct < 5) {
    value = "Moderate";
  } else {
    value = "Far";
  }

  return {
    value,
    reason: `${distPct.toFixed(1)}% from ${nearest.label} ($${nearest.price.toLocaleString()})`,
  };
}

function suggestRiskReward(ctx: SuggestionContext): FactorSuggestion {
  const passes = ctx.rrRatio >= 2;
  return {
    value: passes ? "true" : "false",
    reason: `R:R is ${ctx.rrRatio.toFixed(2)}:1${passes ? "" : " (below 2:1 minimum)"}`,
  };
}

function suggestVolume(ctx: SuggestionContext): FactorSuggestion | null {
  const { lastVolume, volumeAvg20 } = ctx.indicators;
  if (lastVolume === null || volumeAvg20 === null || volumeAvg20 === 0) {
    return null;
  }

  const ratio = lastVolume / volumeAvg20;
  const confirms = ratio >= 1.2;

  return {
    value: confirms ? "true" : "false",
    reason: `Volume ratio ${ratio.toFixed(2)}x avg${confirms ? "" : " (below 1.2x threshold)"}`,
  };
}

function suggestMultiTf(ctx: SuggestionContext): FactorSuggestion | null {
  const timeframes = Object.keys(ctx.indicatorsByTimeframe);
  if (timeframes.length === 0) return null;

  let aligned = 0;
  let total = 0;

  for (const tf of timeframes) {
    const ind = ctx.indicatorsByTimeframe[tf];
    if (ind.ema20 === null || ind.ema50 === null) continue;
    total++;

    const bullish = ind.ema20 > ind.ema50;
    if (
      (ctx.direction === "long" && bullish) ||
      (ctx.direction === "short" && !bullish)
    ) {
      aligned++;
    }
  }

  if (total === 0) return null;

  const ratio = aligned / total;
  let value: string;
  if (ratio === 1) {
    value = "All Aligned";
  } else if (ratio >= 0.75) {
    value = "Mostly Aligned";
  } else if (ratio >= 0.5) {
    value = "Neutral";
  } else {
    value = "Conflicting";
  }

  return {
    value,
    reason: `${aligned}/${total} timeframes align with ${ctx.direction}`,
  };
}

function suggestIra(ctx: SuggestionContext): FactorSuggestion {
  const restricted =
    (ctx.accountType === "ira" || ctx.accountType === "roth") &&
    ctx.direction === "short";

  return {
    value: restricted ? "false" : "true",
    reason: restricted
      ? `Short selling not allowed in ${ctx.accountType.toUpperCase()} accounts`
      : `Trade eligible for ${ctx.accountType} account`,
  };
}

// ── Main entry point ──

export function suggestAllFactors(
  ctx: SuggestionContext
): Record<string, FactorSuggestion> {
  const result: Record<string, FactorSuggestion> = {};

  const trend = suggestTrend(ctx);
  if (trend) result.trend = trend;

  const rsi = suggestRsi(ctx);
  if (rsi) result.rsi = rsi;

  const meanReversion = suggestMeanReversion(ctx);
  if (meanReversion) result.meanReversion = meanReversion;

  const srProximity = suggestSrProximity(ctx);
  if (srProximity) result.srProximity = srProximity;

  // riskReward always has enough data (rrRatio is a required field)
  result.riskReward = suggestRiskReward(ctx);

  const volume = suggestVolume(ctx);
  if (volume) result.volume = volume;

  const multiTf = suggestMultiTf(ctx);
  if (multiTf) result.multiTf = multiTf;

  // ira always has enough data (accountType and direction are required)
  result.ira = suggestIra(ctx);

  return result;
}
