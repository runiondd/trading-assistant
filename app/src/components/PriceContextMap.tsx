"use client";

import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Level {
  id: number;
  price: number;
  label: string;
  levelType: string;
}

interface Indicators {
  rsi: number | null;
  ema20: number | null;
  ema50: number | null;
  bb: { upper: number; middle: number; lower: number } | null;
  kc: { upper: number; middle: number; lower: number } | null;
  atr: number | null;
  volumeAvg20: number | null;
  lastVolume: number | null;
  lastClose: number | null;
  squeeze: boolean;
}

interface StopSuggestion {
  price: number;
  confidence: number;
  sources: { source: string; label: string }[];
}

interface PriceContextMapProps {
  ticker: string;
  lastClose: number | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  direction: "long" | "short";
  levels: Level[];
  indicators: Indicators | null;
  stopSuggestions?: StopSuggestion[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(price: number): string {
  if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function niceStep(range: number, targetTicks: number): number {
  const rough = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const r = rough / mag;
  const nice = r <= 1.5 ? 1 : r <= 3 ? 2 : r <= 7 ? 5 : 10;
  return nice * mag;
}

// ---------------------------------------------------------------------------
// Signal classification — each signal is bullish or bearish
// ---------------------------------------------------------------------------

export interface Signal {
  side: "bull" | "bear";
  label: string;
  detail: string;
  price: number | null; // null = not price-anchored
  strength: 1 | 2 | 3; // visual weight
}

export function classifySignals(
  indicators: Indicators | null,
  currentPrice: number | null,
  levels: Level[],
  direction: "long" | "short",
  entry: number | null,
  stop: number | null,
  target: number | null,
): Signal[] {
  const signals: Signal[] = [];
  if (!indicators || !currentPrice) return signals;

  // RSI
  if (indicators.rsi !== null) {
    if (indicators.rsi >= 70) {
      signals.push({ side: "bear", label: "RSI Overbought", detail: `${indicators.rsi.toFixed(1)}`, price: null, strength: 2 });
    } else if (indicators.rsi <= 30) {
      signals.push({ side: "bull", label: "RSI Oversold", detail: `${indicators.rsi.toFixed(1)}`, price: null, strength: 2 });
    } else if (indicators.rsi > 55) {
      signals.push({ side: "bull", label: "RSI Bullish", detail: `${indicators.rsi.toFixed(1)}`, price: null, strength: 1 });
    } else if (indicators.rsi < 45) {
      signals.push({ side: "bear", label: "RSI Bearish", detail: `${indicators.rsi.toFixed(1)}`, price: null, strength: 1 });
    }
  }

  // EMA trend
  if (indicators.ema20 !== null) {
    if (currentPrice > indicators.ema20) {
      signals.push({ side: "bull", label: "Above EMA 20", detail: `$${fmt(indicators.ema20)}`, price: indicators.ema20, strength: 1 });
    } else {
      signals.push({ side: "bear", label: "Below EMA 20", detail: `$${fmt(indicators.ema20)}`, price: indicators.ema20, strength: 1 });
    }
  }
  if (indicators.ema50 !== null) {
    if (currentPrice > indicators.ema50) {
      signals.push({ side: "bull", label: "Above EMA 50", detail: `$${fmt(indicators.ema50)}`, price: indicators.ema50, strength: 1 });
    } else {
      signals.push({ side: "bear", label: "Below EMA 50", detail: `$${fmt(indicators.ema50)}`, price: indicators.ema50, strength: 2 });
    }
  }

  // EMA alignment
  if (indicators.ema20 !== null && indicators.ema50 !== null) {
    if (indicators.ema20 > indicators.ema50) {
      signals.push({ side: "bull", label: "EMA Bullish Cross", detail: "20 > 50", price: null, strength: 2 });
    } else {
      signals.push({ side: "bear", label: "EMA Bearish Cross", detail: "20 < 50", price: null, strength: 2 });
    }
  }

  // Bollinger position
  if (indicators.bb) {
    const bbRange = indicators.bb.upper - indicators.bb.lower;
    const pricePos = (currentPrice - indicators.bb.lower) / bbRange;
    if (pricePos > 0.9) {
      signals.push({ side: "bear", label: "Near BB Upper", detail: `$${fmt(indicators.bb.upper)}`, price: indicators.bb.upper, strength: 1 });
    } else if (pricePos < 0.1) {
      signals.push({ side: "bull", label: "Near BB Lower", detail: `$${fmt(indicators.bb.lower)}`, price: indicators.bb.lower, strength: 1 });
    }
  }

  // Squeeze
  if (indicators.squeeze) {
    signals.push({ side: "bull", label: "Squeeze Active", detail: "Breakout imminent", price: null, strength: 3 });
  }

  // Volume
  if (indicators.lastVolume !== null && indicators.volumeAvg20 !== null && indicators.volumeAvg20 > 0) {
    const ratio = indicators.lastVolume / indicators.volumeAvg20;
    if (ratio >= 1.5) {
      signals.push({ side: "bull", label: "High Volume", detail: `${ratio.toFixed(1)}x avg`, price: null, strength: 2 });
    } else if (ratio < 0.5) {
      signals.push({ side: "bear", label: "Low Volume", detail: `${ratio.toFixed(1)}x avg`, price: null, strength: 1 });
    }
  }

  // S/R proximity
  const sortedAbove = levels.filter((l) => l.price > currentPrice).sort((a, b) => a.price - b.price);
  const sortedBelow = levels.filter((l) => l.price <= currentPrice).sort((a, b) => b.price - a.price);

  if (sortedAbove.length > 0) {
    const nearest = sortedAbove[0];
    const dist = ((nearest.price - currentPrice) / currentPrice) * 100;
    signals.push({
      side: "bear",
      label: `Resistance ${dist.toFixed(1)}% away`,
      detail: `$${fmt(nearest.price)} — ${nearest.label}`,
      price: nearest.price,
      strength: dist < 2 ? 2 : 1,
    });
  }
  if (sortedBelow.length > 0) {
    const nearest = sortedBelow[0];
    const dist = ((currentPrice - nearest.price) / currentPrice) * 100;
    signals.push({
      side: "bull",
      label: `Support ${dist.toFixed(1)}% away`,
      detail: `$${fmt(nearest.price)} — ${nearest.label}`,
      price: nearest.price,
      strength: dist < 2 ? 2 : 1,
    });
  }

  // R:R
  if (entry && stop && target) {
    const risk = Math.abs(entry - stop);
    const reward = direction === "long" ? target - entry : entry - target;
    const rr = risk > 0 ? reward / risk : 0;
    if (rr >= 2) {
      signals.push({ side: "bull", label: "Strong R:R", detail: `${rr.toFixed(1)}:1`, price: null, strength: 2 });
    } else if (rr < 1 && rr > 0) {
      signals.push({ side: "bear", label: "Weak R:R", detail: `${rr.toFixed(1)}:1`, price: null, strength: 2 });
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const W = 900;
const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 30;
const CENTER_X = W / 2; // Price axis center
const LADDER_HALF = 160; // Half-width of the central price ladder
const LADDER_LEFT = CENTER_X - LADDER_HALF;
const LADDER_RIGHT = CENTER_X + LADDER_HALF;
const BULL_X = LADDER_RIGHT + 20; // Right side — bullish
const BEAR_X = LADDER_LEFT - 20; // Left side — bearish

const C = {
  bg: "#0F172A",
  surface: "#1E293B",
  border: "#334155",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  primary: "#2563EB",
  green: "#16A34A",
  yellow: "#CA8A04",
  red: "#DC2626",
};

// ---------------------------------------------------------------------------
// Anti-collision
// ---------------------------------------------------------------------------

interface Badge {
  y: number;
  origY: number;
  label: string;
  detail: string;
  color: string;
  side: "left" | "right" | "center";
  priority: number;
  fillBg: boolean;
}

function resolveCollisions(badges: Badge[], minGap: number): Badge[] {
  const sorted = [...badges].sort((a, b) => a.y - b.y || a.priority - b.priority);
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].y - sorted[i - 1].y < minGap) {
        sorted[i].y = sorted[i - 1].y + minGap;
      }
    }
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PriceContextMap({
  ticker,
  lastClose,
  entry,
  stop,
  target,
  direction,
  levels,
  indicators,
  stopSuggestions = [],
  height = 600,
}: PriceContextMapProps) {
  const currentPrice = indicators?.lastClose ?? lastClose;

  // Compute tight scale focused on the action zone
  const scale = useMemo(() => {
    if (!currentPrice) return null;

    // Core prices: current, entry, stop, target
    const corePrices = [currentPrice];
    if (entry) corePrices.push(entry);
    if (stop) corePrices.push(stop);
    if (target) corePrices.push(target);

    const coreMin = Math.min(...corePrices);
    const coreMax = Math.max(...corePrices);
    const coreRange = coreMax - coreMin || currentPrice * 0.05;

    // Include nearby levels within 1.5x of the core range
    const expandedMin = coreMin - coreRange * 0.5;
    const expandedMax = coreMax + coreRange * 0.5;
    const nearbyLevels = levels.filter((l) => l.price >= expandedMin && l.price <= expandedMax);

    // Include nearby indicators
    const allPrices = [...corePrices];
    nearbyLevels.forEach((l) => allPrices.push(l.price));
    if (indicators?.ema20 && indicators.ema20 >= expandedMin && indicators.ema20 <= expandedMax) allPrices.push(indicators.ema20);
    if (indicators?.ema50 && indicators.ema50 >= expandedMin && indicators.ema50 <= expandedMax) allPrices.push(indicators.ema50);
    if (indicators?.bb) {
      if (indicators.bb.upper <= expandedMax) allPrices.push(indicators.bb.upper);
      if (indicators.bb.lower >= expandedMin) allPrices.push(indicators.bb.lower);
    }
    stopSuggestions.forEach((s) => {
      if (s.price >= expandedMin && s.price <= expandedMax) allPrices.push(s.price);
    });

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min || currentPrice * 0.05;
    const pad = range * 0.04; // Tight 4% padding
    const paddedMin = min - pad;
    const paddedMax = max + pad;

    const chartTop = TOP_MARGIN;
    const chartBottom = height - BOTTOM_MARGIN;

    const priceToY = (price: number) => {
      const pct = (price - paddedMin) / (paddedMax - paddedMin);
      return chartBottom - pct * (chartBottom - chartTop);
    };

    const step = niceStep(paddedMax - paddedMin, 8);
    const firstTick = Math.ceil(paddedMin / step) * step;
    const ticks: number[] = [];
    for (let t = firstTick; t <= paddedMax; t += step) ticks.push(t);

    return { priceToY, paddedMin, paddedMax, ticks, nearbyLevels };
  }, [currentPrice, entry, stop, target, levels, indicators, stopSuggestions, height]);

  const signals = useMemo(
    () => classifySignals(indicators, currentPrice, levels, direction, entry, stop, target),
    [indicators, currentPrice, levels, direction, entry, stop, target],
  );

  const bullSignals = signals.filter((s) => s.side === "bull");
  const bearSignals = signals.filter((s) => s.side === "bear");

  const bullCount = bullSignals.length;
  const bearCount = bearSignals.length;
  const bias = bullCount > bearCount + 1 ? "BULLISH" : bearCount > bullCount + 1 ? "BEARISH" : "NEUTRAL";
  const biasColor = bias === "BULLISH" ? C.green : bias === "BEARISH" ? C.red : C.yellow;

  if (!scale || !currentPrice) {
    return (
      <div className="w-full rounded-xl bg-background border border-border flex items-center justify-center" style={{ height }}>
        <p className="text-text-muted text-sm">Select an asset to view the price map</p>
      </div>
    );
  }

  const { priceToY, ticks, nearbyLevels } = scale;

  // Build center badges (trade setup lines)
  const centerBadges: Badge[] = [];
  centerBadges.push({
    y: priceToY(currentPrice), origY: priceToY(currentPrice),
    label: `$${fmt(currentPrice)}`, detail: "CURRENT",
    color: C.textPrimary, side: "center", priority: 0, fillBg: true,
  });
  if (entry) {
    centerBadges.push({
      y: priceToY(entry), origY: priceToY(entry),
      label: `$${fmt(entry)}`, detail: "ENTRY",
      color: C.primary, side: "center", priority: 1, fillBg: true,
    });
  }
  if (stop) {
    centerBadges.push({
      y: priceToY(stop), origY: priceToY(stop),
      label: `$${fmt(stop)}`, detail: "STOP",
      color: C.red, side: "center", priority: 1, fillBg: true,
    });
  }
  if (target) {
    centerBadges.push({
      y: priceToY(target), origY: priceToY(target),
      label: `$${fmt(target)}`, detail: "TARGET",
      color: C.green, side: "center", priority: 1, fillBg: true,
    });
  }
  const resolvedCenter = resolveCollisions(centerBadges, 24);

  // Signal badges on left (bearish) and right (bullish)
  const bearBadges: Badge[] = bearSignals.map((s, i) => ({
    y: TOP_MARGIN + 60 + i * 44,
    origY: s.price ? priceToY(s.price) : TOP_MARGIN + 60 + i * 44,
    label: s.label,
    detail: s.detail,
    color: C.red,
    side: "left" as const,
    priority: 3 - s.strength,
    fillBg: false,
  }));

  const bullBadges: Badge[] = bullSignals.map((s, i) => ({
    y: TOP_MARGIN + 60 + i * 44,
    origY: s.price ? priceToY(s.price) : TOP_MARGIN + 60 + i * 44,
    label: s.label,
    detail: s.detail,
    color: C.green,
    side: "right" as const,
    priority: 3 - s.strength,
    fillBg: false,
  }));

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        {/* Background */}
        <rect x="0" y="0" width={W} height={height} rx="12" fill={C.bg} />

        {/* Header */}
        <text x={CENTER_X} y={20} textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill={C.textPrimary}>
          {ticker}
        </text>

        {/* Bias pill */}
        <rect x={CENTER_X - 40} y={30} width={80} height={20} rx={10} fill={`${biasColor}20`} />
        <text x={CENTER_X} y={40} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" letterSpacing="0.08em" fill={biasColor}>
          {bias}
        </text>

        {/* Column headers */}
        <text x={BEAR_X - 70} y={TOP_MARGIN + 14} textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="0.08em" fill={C.red} fillOpacity={0.6}>
          BEARISH
        </text>
        <text x={BEAR_X - 70} y={TOP_MARGIN + 28} textAnchor="middle" fontSize="22" fontWeight="700" fill={C.red} fillOpacity={0.8} fontFamily="var(--font-geist-mono), monospace">
          {bearCount}
        </text>

        <text x={BULL_X + 70} y={TOP_MARGIN + 14} textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="0.08em" fill={C.green} fillOpacity={0.6}>
          BULLISH
        </text>
        <text x={BULL_X + 70} y={TOP_MARGIN + 28} textAnchor="middle" fontSize="22" fontWeight="700" fill={C.green} fillOpacity={0.8} fontFamily="var(--font-geist-mono), monospace">
          {bullCount}
        </text>

        {/* Tug-of-war bar */}
        {(bullCount + bearCount) > 0 && (() => {
          const total = bullCount + bearCount;
          const barW = 120;
          const barX = CENTER_X - barW / 2;
          const bullPct = bullCount / total;
          return (
            <g>
              <rect x={barX} y={TOP_MARGIN + 36} width={barW} height={6} rx={3} fill={C.border} />
              <rect x={barX} y={TOP_MARGIN + 36} width={barW * (1 - bullPct)} height={6} rx={3} fill={C.red} fillOpacity={0.6} />
              <rect x={barX + barW * (1 - bullPct)} y={TOP_MARGIN + 36} width={barW * bullPct} height={6} rx={3} fill={C.green} fillOpacity={0.6} />
            </g>
          );
        })()}

        {/* ── CENTRAL PRICE LADDER ── */}

        {/* Ladder background */}
        <rect x={LADDER_LEFT} y={TOP_MARGIN} width={LADDER_HALF * 2} height={height - TOP_MARGIN - BOTTOM_MARGIN} fill={C.surface} fillOpacity={0.3} rx={8} />

        {/* Grid lines */}
        {ticks.map((t) => {
          const y = priceToY(t);
          return (
            <g key={`t-${t}`}>
              <line x1={LADDER_LEFT + 8} x2={LADDER_RIGHT - 8} y1={y} y2={y} stroke={C.border} strokeOpacity={0.4} strokeDasharray="3 3" />
              <text x={LADDER_LEFT + 12} y={y - 6} fontSize="9" fill={C.textMuted} fillOpacity={0.6} fontFamily="var(--font-geist-mono), monospace">
                ${fmt(t)}
              </text>
            </g>
          );
        })}

        {/* Bollinger Bands shading */}
        {indicators?.bb && (
          <rect
            x={LADDER_LEFT + 4}
            y={priceToY(indicators.bb.upper)}
            width={LADDER_HALF * 2 - 8}
            height={Math.max(0, priceToY(indicators.bb.lower) - priceToY(indicators.bb.upper))}
            fill={C.primary}
            fillOpacity={0.08}
            rx={4}
          />
        )}

        {/* Risk zone */}
        {entry && stop && (
          <rect
            x={LADDER_LEFT + 4}
            y={Math.min(priceToY(entry), priceToY(stop))}
            width={LADDER_HALF * 2 - 8}
            height={Math.abs(priceToY(entry) - priceToY(stop))}
            fill={C.red}
            fillOpacity={0.1}
            rx={4}
          />
        )}

        {/* Reward zone */}
        {entry && target && (
          <rect
            x={LADDER_LEFT + 4}
            y={Math.min(priceToY(entry), priceToY(target))}
            width={LADDER_HALF * 2 - 8}
            height={Math.abs(priceToY(entry) - priceToY(target))}
            fill={C.green}
            fillOpacity={0.08}
            rx={4}
          />
        )}

        {/* Zone labels */}
        {entry && stop && (
          <text
            x={CENTER_X}
            y={(priceToY(entry) + priceToY(stop)) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="600"
            fill={C.red}
            fillOpacity={0.5}
          >
            RISK ${fmt(Math.abs(entry - stop))}
          </text>
        )}
        {entry && target && (
          <text
            x={CENTER_X}
            y={(priceToY(entry) + priceToY(target)) / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontWeight="600"
            fill={C.green}
            fillOpacity={0.5}
          >
            REWARD ${fmt(Math.abs(target - entry))}
          </text>
        )}

        {/* S/R level lines */}
        {nearbyLevels.map((l) => {
          const y = priceToY(l.price);
          const isAbove = l.price > currentPrice;
          const color = isAbove ? C.red : C.green;
          return (
            <g key={`lv-${l.id}`}>
              <line x1={LADDER_LEFT + 8} x2={LADDER_RIGHT - 8} y1={y} y2={y} stroke={color} strokeOpacity={0.5} strokeDasharray="4 2" strokeWidth={1} />
              <text x={LADDER_RIGHT - 12} y={y - 5} textAnchor="end" fontSize="8" fill={color} fillOpacity={0.7}>
                {l.label}
              </text>
            </g>
          );
        })}

        {/* EMA lines */}
        {indicators?.ema20 && (
          <g>
            <line x1={LADDER_LEFT + 8} x2={LADDER_RIGHT - 8} y1={priceToY(indicators.ema20)} y2={priceToY(indicators.ema20)} stroke={C.primary} strokeOpacity={0.5} strokeWidth={1.5} />
            <text x={LADDER_LEFT + 12} y={priceToY(indicators.ema20) - 5} fontSize="8" fill={C.primary} fillOpacity={0.7}>EMA20</text>
          </g>
        )}
        {indicators?.ema50 && (
          <g>
            <line x1={LADDER_LEFT + 8} x2={LADDER_RIGHT - 8} y1={priceToY(indicators.ema50)} y2={priceToY(indicators.ema50)} stroke={C.yellow} strokeOpacity={0.5} strokeWidth={1.5} />
            <text x={LADDER_LEFT + 12} y={priceToY(indicators.ema50) - 5} fontSize="8" fill={C.yellow} fillOpacity={0.7}>EMA50</text>
          </g>
        )}

        {/* Stop suggestion markers */}
        {stopSuggestions.map((s, i) => {
          const y = priceToY(s.price);
          if (y < TOP_MARGIN || y > height - BOTTOM_MARGIN) return null;
          const opacity = 0.3 + (s.confidence / 100) * 0.7;
          return (
            <polygon key={`ss-${i}`} points={`${LADDER_LEFT - 2},${y} ${LADDER_LEFT + 6},${y - 5} ${LADDER_LEFT + 6},${y + 5}`} fill={C.yellow} fillOpacity={opacity} />
          );
        })}

        {/* Trade lines */}
        {stop && (
          <line x1={LADDER_LEFT} x2={LADDER_RIGHT} y1={priceToY(stop)} y2={priceToY(stop)} stroke={C.red} strokeWidth={2} />
        )}
        {target && (
          <line x1={LADDER_LEFT} x2={LADDER_RIGHT} y1={priceToY(target)} y2={priceToY(target)} stroke={C.green} strokeWidth={2} />
        )}
        {entry && (
          <line x1={LADDER_LEFT} x2={LADDER_RIGHT} y1={priceToY(entry)} y2={priceToY(entry)} stroke={C.primary} strokeWidth={2} />
        )}

        {/* Current price — prominent */}
        <line x1={LADDER_LEFT} x2={LADDER_RIGHT} y1={priceToY(currentPrice)} y2={priceToY(currentPrice)} stroke={C.textPrimary} strokeWidth={2} strokeOpacity={0.9} />
        <circle cx={CENTER_X} cy={priceToY(currentPrice)} r={5} fill={C.textPrimary} />

        {/* Center price badges */}
        {resolvedCenter.map((b, i) => {
          const badgeW = 90;
          const badgeH = 22;
          const x = CENTER_X - badgeW / 2;
          const showLeader = Math.abs(b.y - b.origY) > 4;
          return (
            <g key={`cb-${i}`}>
              {showLeader && (
                <line x1={CENTER_X} y1={b.origY} x2={CENTER_X} y2={b.y} stroke={b.color} strokeOpacity={0.3} strokeWidth={0.5} />
              )}
              <rect x={x} y={b.y + 6} width={badgeW} height={badgeH} rx={badgeH / 2} fill={b.color} />
              <text x={CENTER_X} y={b.y + 6 + badgeH / 2} textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill={b.color === C.textPrimary ? C.bg : "#FFFFFF"} fontFamily="var(--font-geist-mono), monospace">
                {b.detail} {b.label}
              </text>
            </g>
          );
        })}

        {/* ── BEARISH SIGNALS (LEFT) ── */}
        {bearBadges.map((b, i) => {
          const cardW = 155;
          const cardH = 36;
          const x = BEAR_X - cardW;
          // Connect to price on ladder if price-anchored
          const connectY = b.origY !== b.y ? b.origY : null;
          return (
            <g key={`bear-${i}`}>
              {connectY !== null && connectY >= TOP_MARGIN && connectY <= height - BOTTOM_MARGIN && (
                <line x1={x + cardW} y1={b.y + cardH / 2} x2={LADDER_LEFT} y2={connectY} stroke={C.red} strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 2" />
              )}
              <rect x={x} y={b.y} width={cardW} height={cardH} rx={6} fill={`${C.red}10`} stroke={C.red} strokeOpacity={0.2} strokeWidth={1} />
              <text x={x + 10} y={b.y + 14} fontSize="10" fontWeight="600" fill={C.red}>{b.label}</text>
              <text x={x + 10} y={b.y + 27} fontSize="9" fill={C.textMuted}>{b.detail}</text>
            </g>
          );
        })}

        {/* ── BULLISH SIGNALS (RIGHT) ── */}
        {bullBadges.map((b, i) => {
          const cardW = 155;
          const cardH = 36;
          const x = BULL_X;
          const connectY = b.origY !== b.y ? b.origY : null;
          return (
            <g key={`bull-${i}`}>
              {connectY !== null && connectY >= TOP_MARGIN && connectY <= height - BOTTOM_MARGIN && (
                <line x1={x} y1={b.y + cardH / 2} x2={LADDER_RIGHT} y2={connectY} stroke={C.green} strokeOpacity={0.2} strokeWidth={1} strokeDasharray="3 2" />
              )}
              <rect x={x} y={b.y} width={cardW} height={cardH} rx={6} fill={`${C.green}10`} stroke={C.green} strokeOpacity={0.2} strokeWidth={1} />
              <text x={x + 10} y={b.y + 14} fontSize="10" fontWeight="600" fill={C.green}>{b.label}</text>
              <text x={x + 10} y={b.y + 27} fontSize="9" fill={C.textMuted}>{b.detail}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
