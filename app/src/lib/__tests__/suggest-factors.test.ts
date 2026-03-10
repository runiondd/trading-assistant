import { describe, it, expect } from "vitest";
import {
  suggestAllFactors,
  SuggestionContext,
  IndicatorSet,
} from "@/lib/suggest-factors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIndicators(overrides: Partial<IndicatorSet> = {}): IndicatorSet {
  return {
    rsi: null,
    ema20: null,
    ema50: null,
    bb: null,
    kc: null,
    volumeAvg20: null,
    lastVolume: null,
    lastClose: null,
    squeeze: false,
    ...overrides,
  };
}

function makeContext(overrides: Partial<SuggestionContext> = {}): SuggestionContext {
  return {
    entryPrice: 100,
    direction: "long",
    timeframe: "4h",
    levels: [],
    accountType: "taxable",
    rrRatio: 2.5,
    indicators: makeIndicators(),
    indicatorsByTimeframe: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// suggestTrend
// ---------------------------------------------------------------------------

describe("suggestTrend", () => {
  it("EMA20 well above EMA50 (>1%) for long → 'Strong'", () => {
    const ctx = makeContext({
      direction: "long",
      indicators: makeIndicators({ ema20: 102, ema50: 100 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.trend.value).toBe("Strong");
  });

  it("EMA20 below EMA50 for long → 'Against'", () => {
    const ctx = makeContext({
      direction: "long",
      indicators: makeIndicators({ ema20: 98, ema50: 100 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.trend.value).toBe("Against");
  });

  it("EMA20 well above EMA50 for SHORT → 'Against' (reversed)", () => {
    const ctx = makeContext({
      direction: "short",
      indicators: makeIndicators({ ema20: 102, ema50: 100 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.trend.value).toBe("Against");
  });

  it("EMA20 ≈ EMA50 (<0.5% diff) → 'Neutral'", () => {
    const ctx = makeContext({
      direction: "long",
      indicators: makeIndicators({ ema20: 100.2, ema50: 100 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.trend.value).toBe("Neutral");
  });

  it("returns no trend key when EMAs are null", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ ema20: null, ema50: null }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.trend).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// suggestRsi
// ---------------------------------------------------------------------------

describe("suggestRsi", () => {
  it("RSI 85 on 4h → 'Overbought' (uses 80 threshold for intraday)", () => {
    const ctx = makeContext({
      timeframe: "4h",
      indicators: makeIndicators({ rsi: 85 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi.value).toBe("Overbought");
  });

  it("RSI 15 on Daily → 'Oversold' (uses 30 threshold for higher TF)", () => {
    const ctx = makeContext({
      timeframe: "Daily",
      indicators: makeIndicators({ rsi: 15 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi.value).toBe("Oversold");
  });

  it("RSI 55 long → 'Confirming'", () => {
    const ctx = makeContext({
      direction: "long",
      timeframe: "4h",
      indicators: makeIndicators({ rsi: 55 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi.value).toBe("Confirming");
  });

  it("RSI 45 long → 'Neutral'", () => {
    const ctx = makeContext({
      direction: "long",
      timeframe: "4h",
      indicators: makeIndicators({ rsi: 45 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi.value).toBe("Neutral");
  });

  it("RSI 45 short → 'Confirming'", () => {
    const ctx = makeContext({
      direction: "short",
      timeframe: "4h",
      indicators: makeIndicators({ rsi: 45 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi.value).toBe("Confirming");
  });

  it("returns no rsi key when RSI is null", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ rsi: null }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.rsi).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// suggestMeanReversion
// ---------------------------------------------------------------------------

describe("suggestMeanReversion", () => {
  it("price at upper BB → 'Extended'", () => {
    const ctx = makeContext({
      entryPrice: 110,
      indicators: makeIndicators({
        bb: { upper: 110, middle: 100, lower: 90 },
        lastClose: 110,
      }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.meanReversion.value).toBe("Extended");
  });

  it("price at lower BB → 'Extended'", () => {
    const ctx = makeContext({
      entryPrice: 90,
      indicators: makeIndicators({
        bb: { upper: 110, middle: 100, lower: 90 },
        lastClose: 90,
      }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.meanReversion.value).toBe("Extended");
  });

  it("price near BB middle → 'At Mean'", () => {
    const ctx = makeContext({
      entryPrice: 100.05,
      indicators: makeIndicators({
        bb: { upper: 110, middle: 100, lower: 90 },
        lastClose: 100.05,
      }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.meanReversion.value).toBe("At Mean");
  });

  it("squeeze detected + near middle → 'At Mean' with squeeze reason", () => {
    const ctx = makeContext({
      entryPrice: 100.05,
      indicators: makeIndicators({
        bb: { upper: 105, middle: 100, lower: 95 },
        kc: { upper: 110, middle: 100, lower: 90 },
        squeeze: true,
        lastClose: 100.05,
      }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.meanReversion.value).toBe("At Mean");
    expect(result.meanReversion.reason).toContain("Squeeze");
  });

  it("returns no meanReversion key when BB is null", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ bb: null }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.meanReversion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// suggestSrProximity
// ---------------------------------------------------------------------------

describe("suggestSrProximity", () => {
  it("no levels → no suggestion (undefined key in result)", () => {
    const ctx = makeContext({ levels: [] });
    const result = suggestAllFactors(ctx);
    expect(result.srProximity).toBeUndefined();
  });

  it("entry at a support level for long → 'At Level'", () => {
    const ctx = makeContext({
      entryPrice: 100,
      direction: "long",
      levels: [{ price: 99.8, label: "Support" }],
    });
    const result = suggestAllFactors(ctx);
    expect(result.srProximity.value).toBe("At Level");
  });

  it("entry far from any level → 'Far'", () => {
    const ctx = makeContext({
      entryPrice: 100,
      direction: "long",
      levels: [{ price: 80, label: "Support" }],
    });
    const result = suggestAllFactors(ctx);
    expect(result.srProximity.value).toBe("Far");
  });

  it("no relevant levels for direction → undefined", () => {
    // Long entry but only levels above (resistance, not support)
    const ctx = makeContext({
      entryPrice: 100,
      direction: "long",
      levels: [{ price: 110, label: "Resistance" }],
    });
    const result = suggestAllFactors(ctx);
    expect(result.srProximity).toBeUndefined();
  });

  it("short entry near resistance → 'At Level'", () => {
    const ctx = makeContext({
      entryPrice: 100,
      direction: "short",
      levels: [{ price: 100.3, label: "Resistance" }],
    });
    const result = suggestAllFactors(ctx);
    expect(result.srProximity.value).toBe("At Level");
  });
});

// ---------------------------------------------------------------------------
// suggestRiskReward
// ---------------------------------------------------------------------------

describe("suggestRiskReward", () => {
  it("rrRatio 3.0 → 'true'", () => {
    const ctx = makeContext({ rrRatio: 3.0 });
    const result = suggestAllFactors(ctx);
    expect(result.riskReward.value).toBe("true");
  });

  it("rrRatio 1.5 → 'false'", () => {
    const ctx = makeContext({ rrRatio: 1.5 });
    const result = suggestAllFactors(ctx);
    expect(result.riskReward.value).toBe("false");
  });

  it("rrRatio exactly 2.0 → 'true'", () => {
    const ctx = makeContext({ rrRatio: 2.0 });
    const result = suggestAllFactors(ctx);
    expect(result.riskReward.value).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// suggestVolume
// ---------------------------------------------------------------------------

describe("suggestVolume", () => {
  it("volume ratio 1.5x → 'true'", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ lastVolume: 1500, volumeAvg20: 1000 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.volume.value).toBe("true");
  });

  it("volume ratio 0.8x → 'false'", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ lastVolume: 800, volumeAvg20: 1000 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.volume.value).toBe("false");
  });

  it("returns no volume key when data is null", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ lastVolume: null, volumeAvg20: null }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.volume).toBeUndefined();
  });

  it("volume ratio exactly 1.2x → 'true' (threshold inclusive)", () => {
    const ctx = makeContext({
      indicators: makeIndicators({ lastVolume: 1200, volumeAvg20: 1000 }),
    });
    const result = suggestAllFactors(ctx);
    expect(result.volume.value).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// suggestMultiTf
// ---------------------------------------------------------------------------

describe("suggestMultiTf", () => {
  it("all 4 timeframes EMA20 > EMA50 for long → 'All Aligned'", () => {
    const tfData: Record<string, IndicatorSet> = {
      "15m": makeIndicators({ ema20: 102, ema50: 100 }),
      "1h": makeIndicators({ ema20: 103, ema50: 100 }),
      "4h": makeIndicators({ ema20: 104, ema50: 100 }),
      Daily: makeIndicators({ ema20: 105, ema50: 100 }),
    };
    const ctx = makeContext({
      direction: "long",
      indicatorsByTimeframe: tfData,
    });
    const result = suggestAllFactors(ctx);
    expect(result.multiTf.value).toBe("All Aligned");
  });

  it("3/4 aligned → 'Mostly Aligned'", () => {
    const tfData: Record<string, IndicatorSet> = {
      "15m": makeIndicators({ ema20: 102, ema50: 100 }),
      "1h": makeIndicators({ ema20: 103, ema50: 100 }),
      "4h": makeIndicators({ ema20: 104, ema50: 100 }),
      Daily: makeIndicators({ ema20: 98, ema50: 100 }), // bearish
    };
    const ctx = makeContext({
      direction: "long",
      indicatorsByTimeframe: tfData,
    });
    const result = suggestAllFactors(ctx);
    expect(result.multiTf.value).toBe("Mostly Aligned");
  });

  it("1/4 aligned → 'Conflicting'", () => {
    const tfData: Record<string, IndicatorSet> = {
      "15m": makeIndicators({ ema20: 102, ema50: 100 }),
      "1h": makeIndicators({ ema20: 98, ema50: 100 }),
      "4h": makeIndicators({ ema20: 97, ema50: 100 }),
      Daily: makeIndicators({ ema20: 96, ema50: 100 }),
    };
    const ctx = makeContext({
      direction: "long",
      indicatorsByTimeframe: tfData,
    });
    const result = suggestAllFactors(ctx);
    expect(result.multiTf.value).toBe("Conflicting");
  });

  it("returns no multiTf key when indicatorsByTimeframe is empty", () => {
    const ctx = makeContext({ indicatorsByTimeframe: {} });
    const result = suggestAllFactors(ctx);
    expect(result.multiTf).toBeUndefined();
  });

  it("short direction: EMA20 < EMA50 counts as aligned", () => {
    const tfData: Record<string, IndicatorSet> = {
      "15m": makeIndicators({ ema20: 98, ema50: 100 }),
      "1h": makeIndicators({ ema20: 97, ema50: 100 }),
      "4h": makeIndicators({ ema20: 96, ema50: 100 }),
      Daily: makeIndicators({ ema20: 95, ema50: 100 }),
    };
    const ctx = makeContext({
      direction: "short",
      indicatorsByTimeframe: tfData,
    });
    const result = suggestAllFactors(ctx);
    expect(result.multiTf.value).toBe("All Aligned");
  });
});

// ---------------------------------------------------------------------------
// suggestIra
// ---------------------------------------------------------------------------

describe("suggestIra", () => {
  it("IRA account + short → 'false'", () => {
    const ctx = makeContext({ accountType: "ira", direction: "short" });
    const result = suggestAllFactors(ctx);
    expect(result.ira.value).toBe("false");
  });

  it("Roth account + short → 'false'", () => {
    const ctx = makeContext({ accountType: "roth", direction: "short" });
    const result = suggestAllFactors(ctx);
    expect(result.ira.value).toBe("false");
  });

  it("taxable + short → 'true'", () => {
    const ctx = makeContext({ accountType: "taxable", direction: "short" });
    const result = suggestAllFactors(ctx);
    expect(result.ira.value).toBe("true");
  });

  it("IRA + long → 'true'", () => {
    const ctx = makeContext({ accountType: "ira", direction: "long" });
    const result = suggestAllFactors(ctx);
    expect(result.ira.value).toBe("true");
  });
});
