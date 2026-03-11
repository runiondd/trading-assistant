import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/price-data";
import {
  calcRSI,
  calcEMA,
  calcATR,
  calcBollingerBands,
  calcKeltnerChannels,
  calcSMA,
  isSqueeze,
  type Candle,
} from "@/lib/indicators";
import { suggestStopLoss, type StopSuggestion } from "@/lib/suggest-stop";
import {
  suggestAllFactors,
  type IndicatorSet,
  type SuggestionContext,
} from "@/lib/suggest-factors";
import { db } from "@/db";
import { assets, levels } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const ALL_TIMEFRAMES = ["Weekly", "Daily", "4h", "1h"] as const;

function buildIndicatorSet(candles: Candle[]): IndicatorSet {
  if (candles.length === 0) {
    return {
      rsi: null,
      ema20: null,
      ema50: null,
      bb: null,
      kc: null,
      atr: null,
      volumeAvg20: null,
      lastVolume: null,
      lastClose: null,
      squeeze: false,
    };
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const ema20Arr = calcEMA(closes, 20);
  const ema50Arr = calcEMA(closes, 50);

  const bb = calcBollingerBands(candles);
  const kc = calcKeltnerChannels(candles);

  return {
    rsi: calcRSI(candles),
    ema20: ema20Arr.length > 0 ? ema20Arr[ema20Arr.length - 1] : null,
    ema50: ema50Arr.length > 0 ? ema50Arr[ema50Arr.length - 1] : null,
    bb,
    kc,
    atr: calcATR(candles),
    volumeAvg20: calcSMA(volumes, 20),
    lastVolume: candles[candles.length - 1].volume,
    lastClose: candles[candles.length - 1].close,
    squeeze: bb !== null && kc !== null ? isSqueeze(bb, kc) : false,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ticker = params.get("ticker");
  const assetClass = params.get("assetClass");
  const timeframe = params.get("timeframe");
  const entryPrice = parseFloat(params.get("entryPrice") ?? "0");
  const stopLoss = parseFloat(params.get("stopLoss") ?? "0");
  const target = parseFloat(params.get("target") ?? "0");
  const direction = (params.get("direction") ?? "long") as "long" | "short";
  const accountId = params.get("accountId");
  const accountType = params.get("accountType") ?? "taxable";

  if (!ticker || !assetClass || !timeframe) {
    return NextResponse.json(
      { error: "Missing required params: ticker, assetClass, timeframe" },
      { status: 400 }
    );
  }

  // Fetch candles for all 4 timeframes in parallel
  const candleResults = await Promise.all(
    ALL_TIMEFRAMES.map((tf) => fetchCandles(ticker, assetClass, tf))
  );

  const candlesByTf: Record<string, Candle[]> = {};
  const multiTf: Record<string, IndicatorSet> = {};

  for (let i = 0; i < ALL_TIMEFRAMES.length; i++) {
    const tf = ALL_TIMEFRAMES[i];
    candlesByTf[tf] = candleResults[i];
    multiTf[tf] = buildIndicatorSet(candleResults[i]);
  }

  const indicators = multiTf[timeframe] ?? buildIndicatorSet([]);

  // Fetch S/R levels for this asset
  let assetLevels: { price: number; label: string; levelType: string }[] = [];

  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.ticker, ticker));

  if (asset) {
    const rows = await db
      .select({ price: levels.price, label: levels.label, levelType: levels.levelType })
      .from(levels)
      .where(and(eq(levels.assetId, asset.id), eq(levels.active, 1)));

    assetLevels = rows;
  }

  // Build suggestion context and compute suggestions
  const ctx: SuggestionContext = {
    entryPrice,
    direction,
    timeframe,
    levels: assetLevels,
    accountType,
    rrRatio: (() => {
      if (!entryPrice || !stopLoss || !target) return 0;
      const risk = Math.abs(entryPrice - stopLoss);
      if (risk === 0) return 0;
      const reward = direction === "long" ? target - entryPrice : entryPrice - target;
      return reward / risk;
    })(),
    indicators,
    indicatorsByTimeframe: multiTf,
  };

  const suggestions = suggestAllFactors(ctx);

  // Compute smart stop loss suggestions
  const stopSuggestions: StopSuggestion[] = entryPrice > 0
    ? suggestStopLoss({
        entryPrice,
        targetPrice: target || null,
        direction,
        levels: assetLevels,
        atr: indicators.atr,
        ema20: indicators.ema20,
        ema50: indicators.ema50,
        bb: indicators.bb,
        kc: indicators.kc,
      })
    : [];

  return NextResponse.json({
    configured: true,
    indicators,
    suggestions,
    stopSuggestions,
    multiTf,
  });
}
