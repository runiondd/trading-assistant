/**
 * Unusual Whales API client — fetches options chain data
 * with a 5-minute in-memory cache (same pattern as price-data.ts).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptionContract {
  symbol: string;
  underlying: string;
  strike: number;
  type: "call" | "put";
  expiration: string;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  bid: number;
  ask: number;
  lastPrice: number;
}

export interface OptionsAnalysis {
  ticker: string;
  contracts: OptionContract[];
  putCallRatio: number | null;
  maxPain: number | null;
  topStrikesByVolume: { strike: number; type: string; volume: number }[];
  unusualActivity: OptionContract[];
}

// ---------------------------------------------------------------------------
// Cache (5-minute TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: OptionsAnalysis; fetchedAt: number }>();

// ---------------------------------------------------------------------------
// Option symbol parsing (OCC format: TICKER YYMMDD C/P STRIKE)
// ---------------------------------------------------------------------------

function parseOptionSymbol(symbol: string): { strike: number; type: "call" | "put"; expiration: string } | null {
  // OCC format: e.g., "AAPL  250321C00175000" or simplified "AAPL250321C00175000"
  const match = symbol.match(/(\d{6})([CP])(\d{8})$/);
  if (!match) return null;
  // Parse YYMMDD → YYYY-MM-DD
  const yy = match[1].slice(0, 2);
  const mm = match[1].slice(2, 4);
  const dd = match[1].slice(4, 6);
  const expiration = `20${yy}-${mm}-${dd}`;
  return {
    type: match[2] === "C" ? "call" : "put",
    strike: parseInt(match[3], 10) / 1000,
    expiration,
  };
}

// ---------------------------------------------------------------------------
// Analysis computation
// ---------------------------------------------------------------------------

function computeAnalysis(ticker: string, contracts: OptionContract[]): OptionsAnalysis {
  if (contracts.length === 0) {
    return { ticker, contracts, putCallRatio: null, maxPain: null, topStrikesByVolume: [], unusualActivity: [] };
  }

  // Put/call ratio by volume
  let callVolume = 0;
  let putVolume = 0;
  for (const c of contracts) {
    if (c.type === "call") callVolume += c.volume;
    else putVolume += c.volume;
  }
  const putCallRatio = callVolume > 0 ? putVolume / callVolume : null;

  // Max pain — strike where total option value (intrinsic) is minimized
  const strikes = [...new Set(contracts.map((c) => c.strike))].sort((a, b) => a - b);
  let maxPain: number | null = null;
  let minPain = Infinity;

  for (const testStrike of strikes) {
    let totalPain = 0;
    for (const c of contracts) {
      if (c.type === "call" && c.strike < testStrike) {
        totalPain += (testStrike - c.strike) * c.openInterest;
      } else if (c.type === "put" && c.strike > testStrike) {
        totalPain += (c.strike - testStrike) * c.openInterest;
      }
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPain = testStrike;
    }
  }

  // Top strikes by volume
  const strikeVolumes = new Map<string, { strike: number; type: string; volume: number }>();
  for (const c of contracts) {
    const key = `${c.strike}-${c.type}`;
    const existing = strikeVolumes.get(key);
    if (existing) {
      existing.volume += c.volume;
    } else {
      strikeVolumes.set(key, { strike: c.strike, type: c.type, volume: c.volume });
    }
  }
  const topStrikesByVolume = [...strikeVolumes.values()]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  // Unusual activity: vol/OI > 3x
  const unusualActivity = contracts.filter(
    (c) => c.openInterest > 0 && c.volume / c.openInterest > 3
  );

  return { ticker, contracts, putCallRatio, maxPain, topStrikesByVolume, unusualActivity };
}

// ---------------------------------------------------------------------------
// API fetch
// ---------------------------------------------------------------------------

export async function getOptionContracts(
  ticker: string,
  apiKey: string,
  expiration?: string,
): Promise<OptionsAnalysis> {
  const cacheKey = `${ticker}:${expiration ?? "all"}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({ ticker_symbol: ticker });
    if (expiration) params.set("expiration", expiration);

    const res = await fetch(
      `https://api.unusualwhales.com/api/stock/${ticker}/option-contracts?${params}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!res.ok) {
      console.warn(`Unusual Whales API error: ${res.status}`);
      return computeAnalysis(ticker, []);
    }

    const json = await res.json();
    const rawContracts: unknown[] = json.data ?? json.contracts ?? json ?? [];

    const contracts: OptionContract[] = [];
    for (const raw of rawContracts) {
      const r = raw as Record<string, unknown>;
      const symbol = String(r.option_symbol ?? r.symbol ?? "");
      const parsed = parseOptionSymbol(symbol);

      contracts.push({
        symbol,
        underlying: ticker,
        strike: parsed?.strike ?? Number(r.strike ?? r.strike_price ?? 0),
        type: parsed?.type ?? (String(r.option_type ?? r.type ?? "call").toLowerCase().startsWith("p") ? "put" : "call"),
        expiration: parsed?.expiration ?? String(r.expiration ?? r.expires_at ?? ""),
        volume: Number(r.volume ?? 0),
        openInterest: Number(r.open_interest ?? r.oi ?? 0),
        impliedVolatility: Number(r.implied_volatility ?? r.iv ?? 0),
        bid: Number(r.nbbo_bid ?? r.bid ?? 0),
        ask: Number(r.nbbo_ask ?? r.ask ?? 0),
        lastPrice: Number(r.last_price ?? r.midpoint ?? 0),
      });
    }

    const analysis = computeAnalysis(ticker, contracts);
    cache.set(cacheKey, { data: analysis, fetchedAt: Date.now() });
    return analysis;
  } catch (err) {
    console.warn("Failed to fetch Unusual Whales data:", err);
    return computeAnalysis(ticker, []);
  }
}
