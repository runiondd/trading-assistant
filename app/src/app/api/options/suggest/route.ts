import { NextRequest, NextResponse } from "next/server";
import { getOptionContracts } from "@/lib/unusual-whales";
import { suggestOptions, type TradeContext } from "@/lib/suggest-options";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getApiKey(name: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: apiKeys.value })
      .from(apiKeys)
      .where(eq(apiKeys.name, name));
    if (row?.value) return row.value;
  } catch {
    // Table may not exist yet
  }
  if (name === "unusual_whales") return process.env.UNUSUAL_WHALES_API_KEY ?? null;
  return null;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const ticker = params.get("ticker");
  const direction = params.get("direction") as "long" | "short" | null;
  const entry = parseFloat(params.get("entry") ?? "");
  const stop = parseFloat(params.get("stop") ?? "");
  const target = parseFloat(params.get("target") ?? "");
  const timeframe = params.get("timeframe") ?? "Daily";
  const riskAmount = parseFloat(params.get("riskAmount") ?? "500");
  const atr = params.get("atr") ? parseFloat(params.get("atr")!) : null;

  if (!ticker || !direction || !entry || !stop || !target) {
    return NextResponse.json(
      { error: "Missing required params: ticker, direction, entry, stop, target" },
      { status: 400 },
    );
  }

  const uwKey = await getApiKey("unusual_whales");
  if (!uwKey) {
    return NextResponse.json(
      { error: "Unusual Whales API key not configured. Add it in Settings > API Keys." },
      { status: 400 },
    );
  }

  const analysis = await getOptionContracts(ticker, uwKey);

  const ctx: TradeContext = {
    direction,
    entry,
    stop,
    target,
    atr,
    timeframe,
    riskAmount,
  };

  const recommendations = suggestOptions(analysis.contracts, ctx);

  return NextResponse.json({
    ticker,
    direction,
    recommendations,
    totalContractsAnalyzed: analysis.contracts.length,
    putCallRatio: analysis.putCallRatio,
    maxPain: analysis.maxPain,
  });
}
