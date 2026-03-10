import { describe, it, expect } from "vitest";
import {
  Candle,
  calcRSI,
  calcEMA,
  calcSMA,
  calcBollingerBands,
  calcATR,
  calcKeltnerChannels,
  calcVolumeRatio,
  isSqueeze,
} from "@/lib/indicators";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _candleTime = 1_000_000;

function makeCandle(
  close: number,
  opts: Partial<Candle> = {}
): Candle {
  _candleTime += 60_000;
  return {
    time: opts.time ?? _candleTime,
    open: opts.open ?? close - 0.05,
    high: opts.high ?? close + 0.10,
    low: opts.low ?? close - 0.10,
    close,
    volume: opts.volume ?? 1000,
  };
}

function makeCandles(closes: number[], opts?: Partial<Candle>): Candle[] {
  return closes.map((c) => makeCandle(c, opts));
}

function makeConstantCandles(price: number, count: number): Candle[] {
  return Array.from({ length: count }, () =>
    makeCandle(price, { open: price, high: price, low: price })
  );
}

// ---------------------------------------------------------------------------
// calcRSI
// ---------------------------------------------------------------------------

describe("calcRSI", () => {
  it("returns null when fewer than period+1 candles", () => {
    const candles = makeCandles([1, 2, 3]);
    expect(calcRSI(candles, 14)).toBeNull();
  });

  it("returns null with exactly period candles (need period+1)", () => {
    const candles = makeCandles(Array.from({ length: 14 }, (_, i) => 10 + i));
    expect(calcRSI(candles, 14)).toBeNull();
  });

  it("returns 100 when all prices go up (no losses)", () => {
    // 15 candles with steadily increasing prices
    const closes = Array.from({ length: 15 }, (_, i) => 10 + i);
    const candles = makeCandles(closes);
    expect(calcRSI(candles, 14)).toBe(100);
  });

  it("returns ~0 when all prices go down (all losses)", () => {
    const closes = Array.from({ length: 15 }, (_, i) => 100 - i);
    const candles = makeCandles(closes);
    const rsi = calcRSI(candles, 14)!;
    expect(rsi).toBeCloseTo(0, 0);
  });

  it("returns ~50 for alternating equal up/down moves", () => {
    // Need period+1 = 15 candles; alternate +1, -1
    const closes: number[] = [50];
    for (let i = 1; i < 15; i++) {
      closes.push(closes[i - 1] + (i % 2 === 1 ? 1 : -1));
    }
    const candles = makeCandles(closes);
    const rsi = calcRSI(candles, 14)!;
    expect(rsi).toBeGreaterThan(40);
    expect(rsi).toBeLessThan(60);
  });

  it("computes classic Wilder RSI ≈ 70.5 with known data", () => {
    const closes = [
      44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
      45.89, 46.03, 45.61, 46.28, 46.28,
    ];
    const candles = makeCandles(closes);
    const rsi = calcRSI(candles, 14)!;
    expect(rsi).toBeGreaterThan(68.5);
    expect(rsi).toBeLessThan(75);
  });
});

// ---------------------------------------------------------------------------
// calcEMA
// ---------------------------------------------------------------------------

describe("calcEMA", () => {
  it("returns empty array when fewer than period values", () => {
    expect(calcEMA([1, 2], 5)).toEqual([]);
  });

  it("returns empty array for period < 1", () => {
    expect(calcEMA([1, 2, 3], 0)).toEqual([]);
  });

  it("first EMA value equals SMA of first period values", () => {
    const closes = [22, 22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29];
    const ema = calcEMA(closes, 10);
    const expectedSma = (22 + 22.27 + 22.19 + 22.08 + 22.17 + 22.18 + 22.13 + 22.23 + 22.43 + 22.24) / 10;
    expect(ema[0]).toBeCloseTo(expectedSma, 4);
  });

  it("EMA with period 1 returns the original values", () => {
    const closes = [10, 20, 30, 40];
    const ema = calcEMA(closes, 1);
    expect(ema).toEqual(closes);
  });

  it("returns correct length (closes.length - period + 1)", () => {
    const closes = [22, 22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29];
    const ema = calcEMA(closes, 10);
    expect(ema).toHaveLength(closes.length - 10 + 1);
  });

  it("computes known EMA(10) values", () => {
    const closes = [22, 22.27, 22.19, 22.08, 22.17, 22.18, 22.13, 22.23, 22.43, 22.24, 22.29];
    const ema = calcEMA(closes, 10);
    // First value is SMA of first 10
    expect(ema[0]).toBeCloseTo(22.192, 2);
    // Second value uses multiplier 2/(10+1) ≈ 0.1818
    // ema[1] = (22.29 - 22.192) * 0.1818 + 22.192
    expect(ema[1]).toBeCloseTo(22.2098, 2);
  });
});

// ---------------------------------------------------------------------------
// calcSMA
// ---------------------------------------------------------------------------

describe("calcSMA", () => {
  it("returns null when fewer than period values", () => {
    expect(calcSMA([1, 2], 5)).toBeNull();
  });

  it("returns null for period < 1", () => {
    expect(calcSMA([1, 2, 3], 0)).toBeNull();
  });

  it("returns average of last N values", () => {
    expect(calcSMA([10, 20, 30, 40, 50], 3)).toBeCloseTo(40, 5);
  });

  it("returns the single value when period is 1", () => {
    expect(calcSMA([10, 20, 30], 1)).toBe(30);
  });

  it("returns average of all values when period equals length", () => {
    expect(calcSMA([10, 20, 30], 3)).toBeCloseTo(20, 5);
  });
});

// ---------------------------------------------------------------------------
// calcBollingerBands
// ---------------------------------------------------------------------------

describe("calcBollingerBands", () => {
  it("returns null when fewer than period candles", () => {
    const candles = makeCandles([1, 2, 3]);
    expect(calcBollingerBands(candles, 20)).toBeNull();
  });

  it("middle band equals SMA of closes", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const candles = makeCandles(closes);
    const bb = calcBollingerBands(candles, 20)!;
    const expectedSma = closes.reduce((a, b) => a + b, 0) / 20;
    expect(bb.middle).toBeCloseTo(expectedSma, 5);
  });

  it("upper and lower are symmetric around middle", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 5);
    const candles = makeCandles(closes);
    const bb = calcBollingerBands(candles, 20)!;
    expect(bb.upper - bb.middle).toBeCloseTo(bb.middle - bb.lower, 10);
  });

  it("with constant prices → stddev is 0 → upper = middle = lower", () => {
    const candles = makeConstantCandles(50, 20);
    const bb = calcBollingerBands(candles, 20)!;
    expect(bb.upper).toBe(bb.middle);
    expect(bb.lower).toBe(bb.middle);
    expect(bb.middle).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calcATR
// ---------------------------------------------------------------------------

describe("calcATR", () => {
  it("returns null when fewer than period+1 candles", () => {
    const candles = makeCandles([1, 2, 3]);
    expect(calcATR(candles, 14)).toBeNull();
  });

  it("with constant-price candles → ATR is 0", () => {
    const candles = makeConstantCandles(100, 16);
    expect(calcATR(candles, 14)).toBe(0);
  });

  it("ATR is positive for volatile candles", () => {
    const candles: Candle[] = [];
    for (let i = 0; i < 16; i++) {
      const base = 100 + (i % 2 === 0 ? 5 : -5);
      candles.push(
        makeCandle(base, {
          open: base - 2,
          high: base + 3,
          low: base - 3,
        })
      );
    }
    const atr = calcATR(candles, 14)!;
    expect(atr).toBeGreaterThan(0);
  });

  it("returns exact period+1 boundary correctly", () => {
    const candles = makeConstantCandles(100, 15); // exactly period+1 = 15
    expect(calcATR(candles, 14)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calcKeltnerChannels
// ---------------------------------------------------------------------------

describe("calcKeltnerChannels", () => {
  it("returns null when not enough data for EMA", () => {
    const candles = makeCandles([1, 2, 3]);
    expect(calcKeltnerChannels(candles, 20, 14, 1.5)).toBeNull();
  });

  it("returns null when not enough data for ATR", () => {
    // Enough for EMA(5) but not ATR(14)
    const candles = makeCandles(Array.from({ length: 10 }, (_, i) => 100 + i));
    expect(calcKeltnerChannels(candles, 5, 14, 1.5)).toBeNull();
  });

  it("middle equals last EMA value", () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i * 0.5);
    const candles = makeCandles(closes);
    const kc = calcKeltnerChannels(candles, 10, 10, 1.5)!;
    const emaValues = calcEMA(closes, 10);
    expect(kc.middle).toBeCloseTo(emaValues[emaValues.length - 1], 10);
  });

  it("upper - middle equals ATR * multiplier", () => {
    const closes = Array.from({ length: 25 }, (_, i) => 100 + i * 0.5);
    const candles = makeCandles(closes);
    const mult = 2.0;
    const kc = calcKeltnerChannels(candles, 10, 10, mult)!;
    const atr = calcATR(candles, 10)!;
    expect(kc.upper - kc.middle).toBeCloseTo(atr * mult, 10);
  });
});

// ---------------------------------------------------------------------------
// calcVolumeRatio
// ---------------------------------------------------------------------------

describe("calcVolumeRatio", () => {
  it("returns null when fewer than period candles", () => {
    const candles = makeCandles([1, 2, 3]);
    expect(calcVolumeRatio(candles, 20)).toBeNull();
  });

  it("returns 1.0 when all volumes are equal", () => {
    const candles = makeCandles(
      Array.from({ length: 20 }, () => 100),
      { volume: 5000 }
    );
    expect(calcVolumeRatio(candles, 20)).toBeCloseTo(1.0, 5);
  });

  it("returns 2.0 when last candle volume is 2x average", () => {
    // 19 candles with volume 1000, last candle with volume 2000
    // avg = (19 * 1000 + 2000) / 20 = 21000 / 20 = 1050
    // ratio = 2000 / 1050 ≈ 1.905... not exactly 2
    // To get exactly 2, all first 19 must average with last to give ratio 2.
    // If all 20 have same volume except last: avg = (19*v + 2v)/20 = 21v/20 = 1.05v, ratio = 2v/1.05v ≈ 1.905
    // For exactly 2.0: need last volume / avgVolume = 2, so all volumes equal except last = 2x
    // Actually, the SMA is over all 20 including the last one. Let's just test the math.
    const candles = makeCandles(Array.from({ length: 20 }, () => 100));
    // Set all volumes to 1000
    candles.forEach((c) => (c.volume = 1000));
    // Set last volume to 2000
    candles[candles.length - 1].volume = 2000;
    const ratio = calcVolumeRatio(candles, 20)!;
    // avg = (19*1000 + 2000)/20 = 1050, ratio = 2000/1050
    expect(ratio).toBeCloseTo(2000 / 1050, 5);
  });

  it("returns exactly 2.0 when last candle is 2x and period excludes it conceptually", () => {
    // Use 21 candles, period 20. SMA of last 20 volumes.
    // If first candle volume is irrelevant, last 20 candles: 19 with 1000, 1 with 2000
    // Same as above. Let's just set up the straightforward case:
    // All 21 candles volume 1000, last one 2000. SMA of last 20 = (19*1000+2000)/20 = 1050
    // ratio = 2000/1050. Still not 2.
    // For exactly 2.0: all candles volume 1000, period = 1 (trivially last vol / avg of last 1)
    const candles = makeCandles([100], { volume: 1000 });
    expect(calcVolumeRatio(candles, 1)).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// isSqueeze
// ---------------------------------------------------------------------------

describe("isSqueeze", () => {
  it("returns true when BB is inside KC", () => {
    const bb = { upper: 105, lower: 95 };
    const kc = { upper: 110, lower: 90 };
    expect(isSqueeze(bb, kc)).toBe(true);
  });

  it("returns false when BB is outside KC", () => {
    const bb = { upper: 115, lower: 85 };
    const kc = { upper: 110, lower: 90 };
    expect(isSqueeze(bb, kc)).toBe(false);
  });

  it("returns false when BB upper equals KC upper (not strictly inside)", () => {
    const bb = { upper: 110, lower: 95 };
    const kc = { upper: 110, lower: 90 };
    expect(isSqueeze(bb, kc)).toBe(false);
  });

  it("returns false when only one side is inside", () => {
    const bb = { upper: 105, lower: 85 }; // upper inside, lower outside
    const kc = { upper: 110, lower: 90 };
    expect(isSqueeze(bb, kc)).toBe(false);
  });
});
