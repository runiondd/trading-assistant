import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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
import { type IndicatorSet } from "@/lib/suggest-factors";
import { getOptionContracts, type OptionsAnalysis } from "@/lib/unusual-whales";
import { db } from "@/db";
import { assets, levels, apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const ALL_TIMEFRAMES = ["Weekly", "Daily", "4h", "1h"] as const;

function buildIndicatorSet(candles: Candle[]): IndicatorSet {
  if (candles.length === 0) {
    return {
      rsi: null, ema20: null, ema50: null, bb: null, kc: null,
      atr: null, volumeAvg20: null, lastVolume: null, lastClose: null, squeeze: false,
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
    bb, kc,
    atr: calcATR(candles),
    volumeAvg20: calcSMA(volumes, 20),
    lastVolume: candles[candles.length - 1].volume,
    lastClose: candles[candles.length - 1].close,
    squeeze: bb !== null && kc !== null ? isSqueeze(bb, kc) : false,
  };
}

async function getApiKey(name: string): Promise<string | null> {
  // DB first, then env var fallback
  try {
    const [row] = await db
      .select({ value: apiKeys.value })
      .from(apiKeys)
      .where(eq(apiKeys.name, name));
    if (row?.value) return row.value;
  } catch {
    // Table may not exist yet
  }
  if (name === "anthropic") return process.env.ANTHROPIC_API_KEY ?? null;
  if (name === "unusual_whales") return process.env.UNUSUAL_WHALES_API_KEY ?? null;
  return null;
}

function formatIndicators(tf: string, ind: IndicatorSet): string {
  const lines: string[] = [`=== ${tf} Timeframe ===`];
  if (ind.lastClose !== null) lines.push(`Price: $${ind.lastClose.toFixed(2)}`);
  if (ind.rsi !== null) lines.push(`RSI(14): ${ind.rsi.toFixed(1)}`);
  if (ind.ema20 !== null) lines.push(`EMA 20: $${ind.ema20.toFixed(2)}`);
  if (ind.ema50 !== null) lines.push(`EMA 50: $${ind.ema50.toFixed(2)}`);
  if (ind.bb) lines.push(`Bollinger Bands: Upper $${ind.bb.upper.toFixed(2)} / Mid $${ind.bb.middle.toFixed(2)} / Lower $${ind.bb.lower.toFixed(2)}`);
  if (ind.kc) lines.push(`Keltner Channels: Upper $${ind.kc.upper.toFixed(2)} / Mid $${ind.kc.middle.toFixed(2)} / Lower $${ind.kc.lower.toFixed(2)}`);
  if (ind.squeeze) lines.push(`*** SQUEEZE DETECTED ***`);
  if (ind.atr !== null) lines.push(`ATR(14): $${ind.atr.toFixed(2)}`);
  if (ind.volumeAvg20 !== null && ind.lastVolume !== null) {
    const volRatio = ind.lastVolume / ind.volumeAvg20;
    lines.push(`Volume: ${ind.lastVolume.toLocaleString()} (${volRatio.toFixed(1)}x avg)`);
  }
  return lines.join("\n");
}

function formatOptionsAnalysis(opts: OptionsAnalysis): string {
  const lines: string[] = ["=== Options Flow ==="];
  if (opts.putCallRatio !== null) lines.push(`Put/Call Ratio: ${opts.putCallRatio.toFixed(2)}`);
  if (opts.maxPain !== null) lines.push(`Max Pain: $${opts.maxPain.toFixed(2)}`);
  if (opts.topStrikesByVolume.length > 0) {
    lines.push("Top Strikes by Volume:");
    for (const s of opts.topStrikesByVolume.slice(0, 5)) {
      lines.push(`  $${s.strike} ${s.type} — ${s.volume.toLocaleString()} contracts`);
    }
  }
  if (opts.unusualActivity.length > 0) {
    lines.push(`Unusual Activity (${opts.unusualActivity.length} contracts with vol/OI > 3x):`);
    for (const c of opts.unusualActivity.slice(0, 5)) {
      const ratio = c.openInterest > 0 ? (c.volume / c.openInterest).toFixed(1) : "N/A";
      lines.push(`  $${c.strike} ${c.type} exp ${c.expiration} — vol ${c.volume.toLocaleString()}, OI ${c.openInterest.toLocaleString()} (${ratio}x)`);
    }
  }
  if (opts.contracts.length === 0) {
    lines.push("No options data available.");
  }
  return lines.join("\n");
}

function formatLevels(lvls: { price: number; label: string; levelType: string }[]): string {
  if (lvls.length === 0) return "";
  const lines = ["=== Support & Resistance Levels ==="];
  for (const l of lvls.sort((a, b) => b.price - a.price)) {
    lines.push(`$${l.price.toFixed(2)} — ${l.label} (${l.levelType})`);
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a concise trade analyst copilot inside a trading journal app. The user will ask about specific stocks.

Your job:
- Analyze the technical indicators and options flow data provided in the conversation context
- Cite specific data points when making observations (e.g., "RSI at 72 suggests...")
- Quantify confidence using terms like "strong", "moderate", or "weak" with reasoning
- Flag conflicts between indicators (e.g., bullish technicals vs bearish options flow)
- Focus on actionable insights: entry zones, key levels, risk factors
- Keep responses focused and structured — use headers and bullet points
- If options data is unavailable, analyze technicals only and note the gap
- Never provide financial advice — frame as analysis, not recommendations
- Equities only — if asked about crypto, politely redirect`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, ticker, timeframe } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    ticker?: string;
    timeframe?: string;
  };

  if (!messages || messages.length === 0) {
    return new Response(JSON.stringify({ error: "Messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const anthropicKey = await getApiKey("anthropic");
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: "Anthropic API key not configured. Add it in Settings > API Keys." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Build market context if ticker is provided
  let contextBlock = "";
  if (ticker) {
    const tf = timeframe ?? "Daily";

    // Fetch technicals for all timeframes
    const candleResults = await Promise.all(
      ALL_TIMEFRAMES.map((t) => fetchCandles(ticker, "equity", t)),
    );
    const indicatorBlocks: string[] = [];
    for (let i = 0; i < ALL_TIMEFRAMES.length; i++) {
      const ind = buildIndicatorSet(candleResults[i]);
      indicatorBlocks.push(formatIndicators(ALL_TIMEFRAMES[i], ind));
    }

    // Fetch S/R levels
    let assetLevels: { price: number; label: string; levelType: string }[] = [];
    const [asset] = await db.select().from(assets).where(eq(assets.ticker, ticker));
    if (asset) {
      assetLevels = await db
        .select({ price: levels.price, label: levels.label, levelType: levels.levelType })
        .from(levels)
        .where(and(eq(levels.assetId, asset.id), eq(levels.active, 1)));
    }

    // Fetch options data
    const uwKey = await getApiKey("unusual_whales");
    let optionsBlock = "";
    if (uwKey) {
      const opts = await getOptionContracts(ticker, uwKey);
      optionsBlock = formatOptionsAnalysis(opts);
    } else {
      optionsBlock = "=== Options Flow ===\nUnusual Whales API key not configured — options data unavailable.";
    }

    contextBlock = [
      `\n--- MARKET DATA FOR ${ticker} (primary timeframe: ${tf}) ---\n`,
      ...indicatorBlocks,
      "",
      formatLevels(assetLevels),
      "",
      optionsBlock,
      "\n--- END MARKET DATA ---",
    ].filter(Boolean).join("\n");
  }

  const systemPrompt = contextBlock
    ? `${SYSTEM_PROMPT}\n\nCurrent market data:\n${contextBlock}`
    : SYSTEM_PROMPT;

  const client = new Anthropic({ apiKey: anthropicKey });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  // Stream as SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
          if (event.type === "message_stop") {
            // Include usage info
            const usage = await stream.finalMessage();
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  usage: {
                    input_tokens: usage.usage.input_tokens,
                    output_tokens: usage.usage.output_tokens,
                  },
                })}\n\n`,
              ),
            );
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
