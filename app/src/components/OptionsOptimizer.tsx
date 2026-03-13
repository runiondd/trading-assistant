"use client";

import { useState, useEffect } from "react";
import Explain from "@/components/Explain";

interface ScoreBreakdown {
  strikeProximity: number;
  riskReward: number;
  liquidity: number;
  dteSweetSpot: number;
}

interface Recommendation {
  contract: {
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
    midPrice: number;
    daysToExpiration: number;
  };
  score: number;
  reasons: string[];
  breakeven: number;
  maxRisk: number;
  suggestedQty: number;
  scoreBreakdown: ScoreBreakdown;
}

interface OptionsOptimizerProps {
  ticker: string;
  direction: "long" | "short";
  entry: number;
  stop: number;
  target: number;
  timeframe: string;
  riskAmount: number;
  atr: number | null;
}

export default function OptionsOptimizer({
  ticker,
  direction,
  entry,
  stop,
  target,
  timeframe,
  riskAmount,
  atr,
}: OptionsOptimizerProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [meta, setMeta] = useState<{
    totalContractsAnalyzed: number;
    putCallRatio: number | null;
    maxPain: number | null;
  } | null>(null);

  useEffect(() => {
    if (!ticker || !entry || !stop || !target) return;

    setLoading(true);
    setError(null);
    setSelectedIndex(null);

    const params = new URLSearchParams({
      ticker,
      direction,
      entry: String(entry),
      stop: String(stop),
      target: String(target),
      timeframe,
      riskAmount: String(riskAmount),
    });
    if (atr) params.set("atr", String(atr));

    fetch(`/api/options/suggest?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setRecommendations([]);
        } else {
          setRecommendations(data.recommendations ?? []);
          setMeta({
            totalContractsAnalyzed: data.totalContractsAnalyzed,
            putCallRatio: data.putCallRatio,
            maxPain: data.maxPain,
          });
        }
      })
      .catch(() => setError("Failed to fetch options suggestions"))
      .finally(() => setLoading(false));
  }, [ticker, direction, entry, stop, target, timeframe, riskAmount, atr]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-text-primary">Options Optimizer</span>
        </div>
        <p className="text-xs text-signal-red">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-text-muted border-t-primary rounded-full animate-spin" />
          <span className="text-xs text-text-muted">Scanning options chain...</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-text-primary">Options Optimizer</span>
        </div>
        <p className="text-xs text-text-muted">
          No qualifying contracts found. Contracts need volume &gt; 0, bid &gt; 0, and 14-60 DTE.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">Options Optimizer</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {direction === "long" ? "CALLS" : "PUTS"}
          </span>
        </div>
        {meta && (
          <span className="text-[10px] text-text-muted">
            {meta.totalContractsAnalyzed} contracts scanned
            {meta.maxPain != null && <> &middot; Max pain ${meta.maxPain}</>}
          </span>
        )}
      </div>

      {/* Recommendation cards */}
      {recommendations.map((rec, i) => {
        const isSelected = selectedIndex === i;
        const c = rec.contract;
        const expDate = new Date(c.expiration).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={c.symbol + c.expiration}
            onClick={() => setSelectedIndex(isSelected ? null : i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedIndex(isSelected ? null : i); }}
            className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-surface hover:border-text-muted"
            }`}
          >
            {/* Top row: strike + type + score */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-text-primary">
                  ${c.strike}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    c.type === "call"
                      ? "bg-signal-green/15 text-signal-green"
                      : "bg-signal-red/15 text-signal-red"
                  }`}
                >
                  {c.type.toUpperCase()}
                </span>
                <span className="text-xs text-text-muted">{expDate}</span>
                <span className="text-[10px] text-text-muted">{c.daysToExpiration}d</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        rec.score >= 70 ? "bg-signal-green" : rec.score >= 45 ? "bg-signal-yellow" : "bg-signal-red"
                      }`}
                      style={{ width: `${rec.score}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-bold font-mono ${
                      rec.score >= 70 ? "text-signal-green" : rec.score >= 45 ? "text-signal-yellow" : "text-signal-red"
                    }`}
                  >
                    {rec.score}
                  </span>
                </div>
                <span onClick={(e) => e.stopPropagation()}>
                  <Explain
                    context={`Options recommendation: $${c.strike} ${c.type} expiring ${c.expiration} (${c.daysToExpiration} DTE) with score ${rec.score}/100. Mid price $${c.midPrice.toFixed(2)}, breakeven $${rec.breakeven}, max risk per contract $${rec.maxRisk}. Score breakdown: Strike proximity ${rec.scoreBreakdown.strikeProximity}/30, Risk-reward ${rec.scoreBreakdown.riskReward}/25, Liquidity ${rec.scoreBreakdown.liquidity}/25, DTE sweet spot ${rec.scoreBreakdown.dteSweetSpot}/20. Reasons: ${rec.reasons.join("; ")}`}
                    ticker={ticker}
                    tradeContext={`${direction} trade, entry $${entry}, stop $${stop}, target $${target}, timeframe ${timeframe}`}
                  />
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 text-xs mb-2">
              <div>
                <span className="text-text-muted block text-[10px]">Premium</span>
                <span className="font-mono text-text-primary font-medium">${c.midPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Max Risk</span>
                <span className="font-mono text-text-primary font-medium">${rec.maxRisk.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Breakeven</span>
                <span className="font-mono text-text-primary font-medium">${rec.breakeven}</span>
              </div>
              <div>
                <span className="text-text-muted block text-[10px]">Qty</span>
                <span className="font-mono text-text-primary font-medium">{rec.suggestedQty}</span>
              </div>
            </div>

            {/* Score breakdown bar */}
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-2">
              <div
                className="bg-blue-500/70 rounded-l-full"
                style={{ width: `${(rec.scoreBreakdown.strikeProximity / 100) * 100}%` }}
                title={`Strike: ${rec.scoreBreakdown.strikeProximity}/30`}
              />
              <div
                className="bg-emerald-500/70"
                style={{ width: `${(rec.scoreBreakdown.riskReward / 100) * 100}%` }}
                title={`R:R: ${rec.scoreBreakdown.riskReward}/25`}
              />
              <div
                className="bg-amber-500/70"
                style={{ width: `${(rec.scoreBreakdown.liquidity / 100) * 100}%` }}
                title={`Liquidity: ${rec.scoreBreakdown.liquidity}/25`}
              />
              <div
                className="bg-purple-500/70 rounded-r-full"
                style={{ width: `${(rec.scoreBreakdown.dteSweetSpot / 100) * 100}%` }}
                title={`DTE: ${rec.scoreBreakdown.dteSweetSpot}/20`}
              />
            </div>

            {/* Reasons */}
            <div className="flex flex-wrap gap-1.5">
              {rec.reasons.map((r, ri) => (
                <span
                  key={ri}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-surface-hover text-text-secondary"
                >
                  {r}
                </span>
              ))}
            </div>

            {/* Extra details on hover/select */}
            {isSelected && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-3 text-[10px] text-text-muted">
                <div>Bid/Ask: <span className="font-mono text-text-secondary">${c.bid.toFixed(2)} / ${c.ask.toFixed(2)}</span></div>
                <div>Volume: <span className="font-mono text-text-secondary">{c.volume.toLocaleString()}</span></div>
                <div>OI: <span className="font-mono text-text-secondary">{c.openInterest.toLocaleString()}</span></div>
                {c.impliedVolatility > 0 && (
                  <div>IV: <span className="font-mono text-text-secondary">{(c.impliedVolatility * 100).toFixed(1)}%</span></div>
                )}
                <div>Total cost: <span className="font-mono text-text-secondary">${(rec.maxRisk * rec.suggestedQty).toLocaleString()}</span></div>
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500/70" /> Strike</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/70" /> R:R</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500/70" /> Liquidity</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500/70" /> DTE</span>
      </div>
    </div>
  );
}
