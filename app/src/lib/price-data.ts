/**
 * Fetches OHLCV candle data from free public APIs (Binance, Yahoo Finance)
 * and normalizes it into a common Candle format.
 */

import { type Candle } from "./indicators";

export type { Candle };

// ---------------------------------------------------------------------------
// Symbol & interval mappings
// ---------------------------------------------------------------------------

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  SOL: "SOLUSDT",
};

const YAHOO_SYMBOLS: Record<string, string> = {
  AAPL: "AAPL",
  SPY: "SPY",
  QQQ: "QQQ",
  GLD: "GLD",
  SLV: "SLV",
};

const BINANCE_INTERVALS: Record<string, string> = {
  "1h": "1h",
  "4h": "4h",
  Daily: "1d",
  Weekly: "1w",
};

const YAHOO_INTERVALS: Record<string, string> = {
  "1h": "1h",
  Daily: "1d",
  Weekly: "1wk",
  // 4h: not native, aggregate from 1h
};

const YAHOO_RANGES: Record<string, string> = {
  "1h": "60d",
  Daily: "6mo",
  Weekly: "2y",
};

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { data: Candle[]; fetchedAt: number }>();

// ---------------------------------------------------------------------------
// Binance
// ---------------------------------------------------------------------------

async function fetchBinanceCandles(
  symbol: string,
  interval: string,
  limit = 100,
): Promise<Candle[]> {
  // Try Binance US first (works from US IPs), fall back to global
  const urls = [
    `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
  ];
  try {
    let res: Response | null = null;
    for (const url of urls) {
      res = await fetch(url);
      if (res.ok) break;
      console.warn(`Binance API error at ${new URL(url).hostname}: ${res.status}`);
    }
    if (!res || !res.ok) {
      return [];
    }
    const raw: unknown[][] = await res.json();
    return raw.map((k) => ({
      time: Number(k[0]),
      open: Number(k[1]),
      high: Number(k[2]),
      low: Number(k[3]),
      close: Number(k[4]),
      volume: Number(k[5]),
    }));
  } catch (err) {
    console.warn("Failed to fetch Binance candles:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Yahoo Finance
// ---------------------------------------------------------------------------

async function fetchYahooCandles(
  ticker: string,
  interval: string,
  range: string,
): Promise<Candle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      console.warn(`Yahoo API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const json = await res.json();
    const result = json.chart?.result?.[0];
    if (!result) {
      console.warn("Yahoo API returned no result");
      return [];
    }

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (
        opens[i] == null ||
        highs[i] == null ||
        lows[i] == null ||
        closes[i] == null
      ) {
        continue;
      }
      candles.push({
        time: timestamps[i] * 1000, // convert seconds → ms
        open: opens[i] as number,
        high: highs[i] as number,
        low: lows[i] as number,
        close: closes[i] as number,
        volume: (volumes[i] as number) ?? 0,
      });
    }
    return candles;
  } catch (err) {
    console.warn("Failed to fetch Yahoo candles:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 1h → 4h aggregation
// ---------------------------------------------------------------------------

function aggregate1hTo4h(candles: Candle[]): Candle[] {
  // Group candles into 4-hour UTC blocks (boundaries at 0, 4, 8, 12, 16, 20)
  const buckets = new Map<number, Candle[]>();

  for (const c of candles) {
    const d = new Date(c.time);
    const hour = d.getUTCHours();
    const blockHour = hour - (hour % 4);
    const blockTime = Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      blockHour,
    );
    const existing = buckets.get(blockTime);
    if (existing) {
      existing.push(c);
    } else {
      buckets.set(blockTime, [c]);
    }
  }

  const result: Candle[] = [];
  const sortedKeys = [...buckets.keys()].sort((a, b) => a - b);

  for (const key of sortedKeys) {
    const group = buckets.get(key)!;
    // Only include complete 4-candle groups
    if (group.length !== 4) continue;
    // Sort by time to ensure correct ordering
    group.sort((a, b) => a.time - b.time);
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function fetchCandles(
  ticker: string,
  assetClass: string,
  timeframe: string,
): Promise<Candle[]> {
  const cacheKey = `${ticker}:${assetClass}:${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  let candles: Candle[] = [];

  try {
    if (assetClass === "crypto") {
      const symbol = BINANCE_SYMBOLS[ticker];
      const interval = BINANCE_INTERVALS[timeframe];
      if (!symbol || !interval) {
        console.warn(
          `No Binance mapping for ticker="${ticker}" timeframe="${timeframe}"`,
        );
        return [];
      }
      candles = await fetchBinanceCandles(symbol, interval);
    } else {
      // equity, commodity, etc. → Yahoo Finance
      const yahooTicker = YAHOO_SYMBOLS[ticker] ?? ticker;

      if (timeframe === "4h") {
        // 4h not native on Yahoo; fetch 1h and aggregate
        const interval = YAHOO_INTERVALS["1h"];
        const range = YAHOO_RANGES["1h"];
        if (!interval || !range) return [];
        const hourly = await fetchYahooCandles(yahooTicker, interval, range);
        candles = aggregate1hTo4h(hourly);
      } else {
        const interval = YAHOO_INTERVALS[timeframe];
        const range = YAHOO_RANGES[timeframe];
        if (!interval || !range) {
          console.warn(
            `No Yahoo mapping for timeframe="${timeframe}"`,
          );
          return [];
        }
        candles = await fetchYahooCandles(yahooTicker, interval, range);
      }
    }
  } catch (err) {
    console.warn(`fetchCandles failed for ${cacheKey}:`, err);
    return [];
  }

  cache.set(cacheKey, { data: candles, fetchedAt: Date.now() });
  return candles;
}
