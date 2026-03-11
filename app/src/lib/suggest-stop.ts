/**
 * Confluence-based stop loss recommendation engine.
 *
 * Generates candidate stop levels from multiple independent sources
 * (S/R levels, ATR, EMAs, Bollinger/Keltner bands), clusters nearby
 * candidates, and scores each cluster by the number and quality of
 * converging signals.
 */

export interface StopCandidate {
  price: number;
  source: string;
  weight: number;
  label: string;
}

export interface StopSuggestion {
  price: number;
  confidence: number; // 0-100
  sources: { source: string; label: string }[];
  riskPct: number; // distance from entry as %
  rrRatio: number | null; // R:R if target provided
}

export interface StopInputs {
  entryPrice: number;
  targetPrice: number | null;
  direction: "long" | "short";
  levels: { price: number; label: string; levelType: string }[];
  atr: number | null;
  ema20: number | null;
  ema50: number | null;
  bb: { upper: number; middle: number; lower: number } | null;
  kc: { upper: number; middle: number; lower: number } | null;
}

// Source weights — how much each signal type contributes to confidence
const WEIGHTS = {
  manual: 30, // Human-identified S/R — highest conviction
  atr: 25, // Volatility-calibrated, always relevant
  fibonacci: 20, // Widely watched retracement levels
  ema50: 20, // Strong dynamic support/resistance
  ema20: 15, // Shorter-term dynamic level
  bb: 15, // Bollinger Band envelope
  kc: 10, // Keltner Channel (secondary)
  pivot: 15, // Pivot points
} as const;

// Confluence bonus per additional source in a cluster
const CONFLUENCE_BONUS = 15;

// Cluster tolerance: candidates within this % of entry are merged
const CLUSTER_PCT = 0.5;

/**
 * Generate all candidate stop levels from available data sources.
 */
function generateCandidates(inputs: StopInputs): StopCandidate[] {
  const { entryPrice, direction, levels, atr, ema20, ema50, bb, kc } = inputs;
  const candidates: StopCandidate[] = [];

  const isValidStop = (price: number) => {
    if (direction === "long") return price < entryPrice;
    return price > entryPrice;
  };

  // 1. S/R levels (manual, fibonacci, pivot)
  for (const level of levels) {
    if (isValidStop(level.price)) {
      const type = level.levelType as keyof typeof WEIGHTS;
      const weight = WEIGHTS[type] ?? 15;
      candidates.push({
        price: level.price,
        source: level.levelType,
        weight,
        label: level.label,
      });
    }
  }

  // 2. ATR-based stop (1.5× ATR from entry)
  if (atr !== null && atr > 0) {
    const atrStop =
      direction === "long"
        ? entryPrice - 1.5 * atr
        : entryPrice + 1.5 * atr;
    if (isValidStop(atrStop)) {
      candidates.push({
        price: atrStop,
        source: "atr",
        weight: WEIGHTS.atr,
        label: `1.5× ATR ($${atr.toFixed(2)})`,
      });
    }
  }

  // 3. EMA 50
  if (ema50 !== null && isValidStop(ema50)) {
    candidates.push({
      price: ema50,
      source: "ema50",
      weight: WEIGHTS.ema50,
      label: "EMA 50",
    });
  }

  // 4. EMA 20
  if (ema20 !== null && isValidStop(ema20)) {
    candidates.push({
      price: ema20,
      source: "ema20",
      weight: WEIGHTS.ema20,
      label: "EMA 20",
    });
  }

  // 5. Bollinger Band
  if (bb !== null) {
    const bbStop = direction === "long" ? bb.lower : bb.upper;
    if (isValidStop(bbStop)) {
      candidates.push({
        price: bbStop,
        source: "bb",
        weight: WEIGHTS.bb,
        label: direction === "long" ? "BB Lower" : "BB Upper",
      });
    }
  }

  // 6. Keltner Channel
  if (kc !== null) {
    const kcStop = direction === "long" ? kc.lower : kc.upper;
    if (isValidStop(kcStop)) {
      candidates.push({
        price: kcStop,
        source: "kc",
        weight: WEIGHTS.kc,
        label: direction === "long" ? "KC Lower" : "KC Upper",
      });
    }
  }

  return candidates;
}

/**
 * Cluster nearby candidates and score each cluster by confluence.
 */
function clusterAndScore(
  candidates: StopCandidate[],
  entryPrice: number,
  targetPrice: number | null,
  direction: "long" | "short",
): StopSuggestion[] {
  if (candidates.length === 0) return [];

  // Sort by price (ascending for longs — closest to entry last; descending for shorts)
  const sorted = [...candidates].sort((a, b) =>
    direction === "long" ? a.price - b.price : b.price - a.price,
  );

  const tolerance = entryPrice * (CLUSTER_PCT / 100);
  const clusters: StopCandidate[][] = [];

  for (const candidate of sorted) {
    let merged = false;
    for (const cluster of clusters) {
      // Check if this candidate is within tolerance of any member
      const clusterCenter =
        cluster.reduce((s, c) => s + c.price, 0) / cluster.length;
      if (Math.abs(candidate.price - clusterCenter) <= tolerance) {
        cluster.push(candidate);
        merged = true;
        break;
      }
    }
    if (!merged) {
      clusters.push([candidate]);
    }
  }

  // Score each cluster
  const suggestions: StopSuggestion[] = clusters.map((cluster) => {
    // Weighted average price
    const totalWeight = cluster.reduce((s, c) => s + c.weight, 0);
    const weightedPrice =
      cluster.reduce((s, c) => s + c.price * c.weight, 0) / totalWeight;

    // Base confidence from summed weights
    let confidence = totalWeight;

    // Confluence bonus for multiple independent sources
    const uniqueSources = new Set(cluster.map((c) => c.source));
    if (uniqueSources.size > 1) {
      confidence += (uniqueSources.size - 1) * CONFLUENCE_BONUS;
    }

    // Cap at 100
    confidence = Math.min(100, confidence);

    // Risk % from entry
    const riskPct = (Math.abs(entryPrice - weightedPrice) / entryPrice) * 100;

    // R:R ratio if target provided
    let rrRatio: number | null = null;
    if (targetPrice !== null) {
      const risk = Math.abs(entryPrice - weightedPrice);
      if (risk > 0) {
        const reward =
          direction === "long"
            ? targetPrice - entryPrice
            : entryPrice - targetPrice;
        rrRatio = reward / risk;
      }
    }

    // Deduplicate source labels (keep unique sources)
    const sources = cluster.map((c) => ({
      source: c.source,
      label: c.label,
    }));

    return {
      price: weightedPrice,
      confidence,
      sources,
      riskPct,
      rrRatio,
    };
  });

  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);

  // Return top 3
  return suggestions.slice(0, 3);
}

/**
 * Main entry point: generate smart stop loss suggestions.
 */
export function suggestStopLoss(inputs: StopInputs): StopSuggestion[] {
  if (inputs.entryPrice <= 0) return [];

  const candidates = generateCandidates(inputs);
  return clusterAndScore(
    candidates,
    inputs.entryPrice,
    inputs.targetPrice,
    inputs.direction,
  );
}
