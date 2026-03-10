/**
 * Pure math library for computing technical indicators from OHLCV candle data.
 * No external dependencies, no API calls.
 */

export interface Candle {
  time: number;      // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Wilder's smoothing RSI.
 * Requires at least `period + 1` candles.
 */
export function calcRSI(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const closes = candles.map((c) => c.close);

  // Calculate initial gains and losses
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) {
      avgGain += delta;
    } else {
      avgLoss += Math.abs(delta);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's smoothing for remaining candles
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Exponential Moving Average.
 * Returns an array of EMA values (length = closes.length - period + 1).
 * First EMA value is the SMA of the first `period` values.
 * Multiplier: 2 / (period + 1).
 */
export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period || period < 1) return [];

  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  // First EMA is SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  let ema = sum / period;
  result.push(ema);

  // Subsequent EMAs use the multiplier
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

/**
 * Simple Moving Average of the last `period` values.
 */
export function calcSMA(values: number[], period: number): number | null {
  if (values.length < period || period < 1) return null;

  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
}

/**
 * Bollinger Bands: SMA(close, period) +/- stdDev * mult.
 * Requires at least `period` candles.
 */
export function calcBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMult = 2
): { upper: number; middle: number; lower: number } | null {
  if (candles.length < period) return null;

  const closes = candles.map((c) => c.close);
  const slice = closes.slice(closes.length - period);

  const middle = slice.reduce((a, b) => a + b, 0) / period;

  const variance =
    slice.reduce((sum, val) => sum + (val - middle) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDev * stdDevMult,
    middle,
    lower: middle - stdDev * stdDevMult,
  };
}

/**
 * Average True Range with Wilder's smoothing.
 * Requires at least `period + 1` candles (need prior candle for first TR).
 */
export function calcATR(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  // Calculate true ranges (starting from index 1)
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }

  // First ATR is simple average of first `period` true ranges
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trueRanges[i];
  }
  atr /= period;

  // Apply Wilder's smoothing for remaining values
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  return atr;
}

/**
 * Keltner Channels: EMA(close) +/- ATR * mult.
 */
export function calcKeltnerChannels(
  candles: Candle[],
  emaPeriod = 20,
  atrPeriod = 14,
  atrMult = 1.5
): { upper: number; middle: number; lower: number } | null {
  const closes = candles.map((c) => c.close);
  const emaValues = calcEMA(closes, emaPeriod);
  if (emaValues.length === 0) return null;

  const atr = calcATR(candles, atrPeriod);
  if (atr === null) return null;

  const middle = emaValues[emaValues.length - 1];

  return {
    upper: middle + atr * atrMult,
    middle,
    lower: middle - atr * atrMult,
  };
}

/**
 * Volume Ratio: last candle volume / SMA(volume, period).
 */
export function calcVolumeRatio(candles: Candle[], period = 20): number | null {
  if (candles.length < period) return null;

  const volumes = candles.map((c) => c.volume);
  const avgVolume = calcSMA(volumes, period);
  if (avgVolume === null || avgVolume === 0) return null;

  return candles[candles.length - 1].volume / avgVolume;
}

/**
 * Squeeze detection: returns true when Bollinger Bands are inside Keltner Channels
 * (low volatility squeeze).
 */
export function isSqueeze(
  bb: { upper: number; lower: number },
  kc: { upper: number; lower: number }
): boolean {
  return bb.upper < kc.upper && bb.lower > kc.lower;
}
