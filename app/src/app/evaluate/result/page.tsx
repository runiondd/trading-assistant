"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/Card";
import FactorBar from "@/components/FactorBar";
import Tooltip from "@/components/Tooltip";

/* ── Types ────────────────────────────────────────────────────────────── */

interface Evaluation {
  id: number;
  assetId: number;
  accountId: number;
  direction: string;
  timeframe: string;
  entryPrice: number;
  stopLoss: number;
  targetsJson: string;
  compositeScore: number | null;
  signal: string | null;
  status: string;
  rrRatio: number | null;
  positionSize: number | null;
  positionCost: number | null;
  vehicle: string | null;
  iraEligible: number | null;
  confirmedAt: string | null;
  passedAt: string | null;
  passReason: string | null;
  overridesJson: string | null;
  createdAt: string;
}

interface FactorScore {
  id: number;
  evaluationId: number;
  factorId: number;
  rawValue: string;
  normalizedScore: number;
  maxScore: number;
  factorName: string;
  factorWeight: number;
}

interface Asset {
  id: number;
  ticker: string;
  name: string;
}

interface Account {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  defaultRiskPct: number;
}

/* ── Signal helpers ───────────────────────────────────────────────────── */

function signalColor(signal: string | null) {
  switch (signal) {
    case "green":
      return "signal-green";
    case "yellow":
      return "signal-yellow";
    case "red":
      return "signal-red";
    default:
      return "text-muted";
  }
}

function signalLabel(signal: string | null, score: number | null) {
  if (score === null) return "N/A";
  if (signal === "green") return "HIGH CONVICTION";
  if (signal === "yellow") return "MODERATE CONVICTION";
  return "LOW CONVICTION";
}

/* ── Inner component (needs useSearchParams) ─────────────────────────── */

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const evaluationId = searchParams.get("id");

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [factorScores, setFactorScores] = useState<FactorScore[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!evaluationId) {
      setError("No evaluation ID provided.");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const res = await fetch(`/api/evaluations/${evaluationId}`);
        if (res.status === 404) {
          setError("Evaluation not found.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError("Failed to load evaluation.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        const ev: Evaluation = data.evaluation;
        setEvaluation(ev);
        setFactorScores(data.factorScores ?? []);

        // Fetch asset & account in parallel
        const [assetsRes, accountsRes] = await Promise.all([
          fetch("/api/assets"),
          fetch("/api/accounts"),
        ]);

        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          const list: Asset[] = Array.isArray(assetsData)
            ? assetsData
            : assetsData.assets ?? [];
          setAsset(list.find((a) => a.id === ev.assetId) ?? null);
        }

        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const list: Account[] = Array.isArray(accountsData)
            ? accountsData
            : accountsData.accounts ?? [];
          setAccount(list.find((a) => a.id === ev.accountId) ?? null);
        }
      } catch {
        setError("Failed to load evaluation.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [evaluationId]);

  const handleConfirm = useCallback(async () => {
    if (!evaluationId || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/confirm`, {
        method: "PUT",
      });
      if (res.ok) {
        router.push("/");
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to confirm trade.");
        setActing(false);
      }
    } catch {
      setError("Failed to confirm trade.");
      setActing(false);
    }
  }, [evaluationId, acting, router]);

  const handlePass = useCallback(async () => {
    if (!evaluationId || acting) return;
    setActing(true);
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}/pass`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        router.push("/");
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Failed to pass on trade.");
        setActing(false);
      }
    } catch {
      setError("Failed to pass on trade.");
      setActing(false);
    }
  }, [evaluationId, acting, router]);

  /* ── Loading state ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="max-w-4xl flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-text-muted border-t-signal-green rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Loading evaluation...</span>
        </div>
      </div>
    );
  }

  /* ── Error / not found ──────────────────────────────────────────────── */

  if (error || !evaluation) {
    return (
      <div className="max-w-4xl flex flex-col items-center justify-center py-24 gap-4">
        <span className="text-lg text-signal-red font-semibold">
          {error ?? "Evaluation not found."}
        </span>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-border text-text-primary text-sm transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  /* ── Derived values ─────────────────────────────────────────────────── */

  const score = evaluation.compositeScore ?? 0;
  const signal = evaluation.signal;
  const color = signalColor(signal);
  const conviction = signalLabel(signal, evaluation.compositeScore);
  const ticker = asset?.ticker ?? `Asset #${evaluation.assetId}`;
  const accountName = account?.name ?? `Account #${evaluation.accountId}`;

  const targets: number[] = (() => {
    try {
      return JSON.parse(evaluation.targetsJson);
    } catch {
      return [];
    }
  })();
  const firstTarget = targets[0] ?? null;

  const riskPerShare = Math.abs(evaluation.entryPrice - evaluation.stopLoss);
  const riskDollar =
    evaluation.positionSize != null
      ? riskPerShare * evaluation.positionSize
      : null;

  const factors = factorScores.map((fs) => ({
    name: fs.factorName,
    score: fs.normalizedScore,
    max: fs.maxScore,
    passed: fs.normalizedScore > 0,
  }));

  const alreadyActioned =
    evaluation.status === "confirmed" || evaluation.status === "passed";

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl space-y-6">
      {/* Traffic Light */}
      <div className="flex flex-col items-center py-6">
        <div
          className={`relative w-28 h-28 rounded-full bg-${color}/20 flex items-center justify-center mb-3`}
        >
          <div
            className={`w-20 h-20 rounded-full bg-${color}/30 flex items-center justify-center`}
          >
            <span
              className={`text-4xl font-bold font-mono text-${color} group/score relative`}
            >
              {Math.round(score)}
              <span className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 z-50 w-max max-w-xs rounded-lg border border-border bg-slate-900/95 px-3 py-2.5 text-sm font-normal text-text-secondary shadow-lg opacity-0 transition-opacity duration-150 group-hover/score:opacity-100">
                Composite checklist score (0-100). Sum of all weighted factors.
                75+ = green, 50-74 = yellow, below 50 = red.
              </span>
            </span>
          </div>
        </div>
        <span
          className={`text-lg font-bold text-${color} tracking-wide flex items-center gap-1.5`}
        >
          {conviction}
          <Tooltip text="Based on composite score: 75+ = High, 50-74 = Moderate, <50 = Low." />
        </span>
        <span className="text-sm text-text-muted mt-1">
          {ticker} {evaluation.direction.toUpperCase()} {evaluation.timeframe}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trade Plan */}
        <Card>
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Trade Plan
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Entry</span>
              <span className="font-mono text-text-primary">
                ${evaluation.entryPrice.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Stop Loss</span>
              <span className="font-mono text-signal-red">
                ${evaluation.stopLoss.toLocaleString()}
              </span>
            </div>
            {firstTarget !== null && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Target</span>
                <span className="font-mono text-signal-green">
                  ${firstTarget.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-text-secondary">R:R</span>
              <span className="font-mono font-semibold text-text-primary">
                {evaluation.rrRatio != null
                  ? `${parseFloat(evaluation.rrRatio.toFixed(2))}:1`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary flex items-center gap-1">
                Vehicle
                <Tooltip text="The instrument type: shares, options, or futures. MVP defaults to shares." />
              </span>
              <span className="text-text-primary capitalize">
                {evaluation.vehicle ?? "shares"}
              </span>
            </div>
          </div>
        </Card>

        {/* Position Sizing */}
        <Card>
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">
            Position Sizing
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Account</span>
              <span className="text-text-primary">{accountName}</span>
            </div>
            {account && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Balance</span>
                  <span className="font-mono text-text-primary">
                    ${account.balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Risk %</span>
                  <span className="font-mono text-text-primary">
                    {account.defaultRiskPct}%
                  </span>
                </div>
              </>
            )}
            {riskDollar !== null && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Risk $</span>
                <span className="font-mono text-signal-yellow">
                  ${Math.round(riskDollar).toLocaleString()}
                </span>
              </div>
            )}
            {evaluation.positionSize != null && (
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-text-secondary">Shares</span>
                <span className="font-mono font-semibold text-text-primary">
                  {Math.round(evaluation.positionSize)}
                </span>
              </div>
            )}
            {evaluation.positionCost != null && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Cost</span>
                <span className="font-mono font-semibold text-text-primary">
                  ${Math.round(evaluation.positionCost).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Checklist Breakdown */}
      {factors.length > 0 && (
        <Card>
          <h3 className="text-xs text-text-muted uppercase tracking-wider mb-4">
            Checklist Breakdown
          </h3>
          <div className="space-y-2.5">
            {factors.map((f) => (
              <FactorBar
                key={f.name}
                label={f.name}
                score={f.score}
                max={f.max}
                passed={f.passed}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Overrides */}
      {evaluation.overridesJson && (() => {
        const overrides: Record<string, { suggested: string; chosen: string }> = JSON.parse(evaluation.overridesJson);
        return Object.keys(overrides).length > 0 ? (
          <Card>
            <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
              Manual Overrides
              <Tooltip text="Factors where the system suggested a value based on live indicators, but you chose differently." />
            </h3>
            <div className="space-y-2">
              {Object.entries(overrides).map(([name, { suggested, chosen }]) => (
                <div key={name} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-signal-yellow/5 border border-signal-yellow/20">
                  <span className="text-text-primary font-medium">{name}</span>
                  <span className="text-text-secondary">
                    System: <span className="font-mono text-text-muted">{suggested}</span>
                    {" → "}
                    You: <span className="font-mono text-signal-yellow">{chosen}</span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ) : null;
      })()}

      {/* Action Buttons */}
      {!alreadyActioned && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleConfirm}
            disabled={acting}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-signal-green hover:bg-signal-green/90 text-white font-semibold text-lg transition-colors relative group/confirm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &#10003; Confirm Trade
            <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-max max-w-xs rounded-lg border border-border bg-slate-900/95 px-3 py-2.5 text-sm font-normal text-text-secondary shadow-lg opacity-0 transition-opacity duration-150 group-hover/confirm:opacity-100">
              Logs this trade as taken. You&apos;ll be prompted to log the
              outcome later.
            </span>
          </button>
          <button
            onClick={handlePass}
            disabled={acting}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-surface-hover hover:bg-border text-text-primary font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &#10005; Pass
          </button>
        </div>
      )}

      {alreadyActioned && (
        <div className="text-center py-4">
          <span className="text-sm text-text-muted">
            This evaluation has been{" "}
            <span className="font-semibold text-text-secondary">
              {evaluation.status}
            </span>
            .
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Page wrapper with Suspense boundary ─────────────────────────────── */

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-text-muted border-t-signal-green rounded-full animate-spin" />
            <span className="text-sm text-text-muted">Loading...</span>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
