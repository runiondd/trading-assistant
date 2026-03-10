"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import { SignalDot, type SignalLevel } from "@/components/SignalBadge";
import Tooltip from "@/components/Tooltip";

const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

/* ── Types ─────────────────────────────────────────────────────────── */

interface Account {
  id: number;
  name: string;
  accountType: string;
  balance: number;
  defaultRiskPct: number;
  plaidAccountId: string | null;
  plaidAccessToken: string | null;
  balanceUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Outcome {
  actualEntry: number | null;
  actualExit: number | null;
  pnl: number | null;
  notes: string | null;
  closedAt: string | null;
}

interface Evaluation {
  id: number;
  assetId: number;
  accountId: number;
  direction: string;
  timeframe: string;
  entryPrice: number;
  stopLoss: number;
  targetsJson: string | null;
  compositeScore: number;
  signal: SignalLevel;
  status: string;
  rrRatio: number | null;
  positionSize: number | null;
  positionCost: number | null;
  vehicle: string | null;
  iraEligible: boolean | null;
  confirmedAt: string | null;
  passedAt: string | null;
  passReason: string | null;
  createdAt: string;
  ticker: string;
  assetName: string;
  outcome: Outcome | null;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function firstTarget(targetsJson: string | null): number | null {
  if (!targetsJson) return null;
  try {
    const targets = JSON.parse(targetsJson);
    if (Array.isArray(targets) && targets.length > 0) {
      return typeof targets[0] === "object" ? targets[0].price : targets[0];
    }
  } catch {
    /* ignore */
  }
  return null;
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentEvals, setRecentEvals] = useState<Evaluation[]>([]);
  const [openTrades, setOpenTrades] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [staleIds, setStaleIds] = useState<Set<number>>(new Set());
  const hasTriggeredRefresh = useRef(false);

  const refreshStaleAccounts = useCallback(async (accts: Account[]) => {
    const stale = accts.filter((a) => {
      if (!a.plaidAccessToken) return false;
      if (!a.balanceUpdatedAt) return true;
      return Date.now() - new Date(a.balanceUpdatedAt).getTime() > STALE_THRESHOLD_MS;
    });

    if (stale.length === 0) return;

    setSyncingIds(new Set(stale.map((a) => a.id)));

    const results = await Promise.allSettled(
      stale.map(async (a) => {
        const res = await fetch(`/api/accounts/${a.id}/refresh`, { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: Account = await res.json();
        return updated;
      })
    );

    const newStaleIds = new Set<number>();

    setAccounts((prev) => {
      const updated = [...prev];
      for (let i = 0; i < stale.length; i++) {
        const result = results[i];
        const idx = updated.findIndex((a) => a.id === stale[i].id);
        if (idx === -1) continue;

        if (result.status === "fulfilled") {
          updated[idx] = result.value;
        } else {
          newStaleIds.add(stale[i].id);
        }
      }
      return updated;
    });

    setStaleIds(newStaleIds);
    setSyncingIds(new Set());
  }, []);

  const fetchDashboard = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [accountsRes, evalsRes, tradesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/journal?limit=5"),
        fetch("/api/journal?status=confirmed&limit=10"),
      ]);

      let fetchedAccounts: Account[] = [];
      if (accountsRes.ok) {
        fetchedAccounts = await accountsRes.json();
        setAccounts(fetchedAccounts);
      }
      if (evalsRes.ok) setRecentEvals(await evalsRes.json());
      if (tradesRes.ok) {
        const confirmed: Evaluation[] = await tradesRes.json();
        setOpenTrades(confirmed.filter((t) => !t.outcome));
      }

      // Trigger background refresh for stale Plaid accounts (once)
      if (!hasTriggeredRefresh.current && fetchedAccounts.length > 0) {
        hasTriggeredRefresh.current = true;
        refreshStaleAccounts(fetchedAccounts);
      }
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [refreshStaleAccounts]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        {/* Account card skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-24 bg-surface-hover rounded" />
                <div className="h-8 w-40 bg-surface-hover rounded" />
                <div className="h-4 w-48 bg-surface-hover rounded" />
              </div>
            </Card>
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="h-14 bg-surface-hover rounded-xl animate-pulse" />

        {/* Table skeleton */}
        <Card>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-40 bg-surface-hover rounded" />
            <div className="h-4 w-full bg-surface-hover rounded" />
            <div className="h-4 w-full bg-surface-hover rounded" />
            <div className="h-4 w-3/4 bg-surface-hover rounded" />
          </div>
        </Card>

        {/* Open trades skeleton */}
        <Card>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-32 bg-surface-hover rounded" />
            <div className="h-4 w-full bg-surface-hover rounded" />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl">
        <Card>
          <div className="flex flex-col items-center py-12 gap-4">
            <p className="text-signal-red font-semibold">{error}</p>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-border text-text-primary text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((a) => {
          const riskAmt = (a.balance * a.defaultRiskPct) / 100;
          const isSyncing = syncingIds.has(a.id);
          const isStale = staleIds.has(a.id);
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{a.name}</h3>
                  <p className="text-2xl font-bold font-mono text-text-primary mt-1">
                    ${a.balance.toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-text-muted flex items-center gap-1.5">
                  {isSyncing ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Syncing...
                    </>
                  ) : isStale ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-yellow" />
                      <span className="text-signal-yellow">
                        Balance may be stale
                        {a.balanceUpdatedAt && ` \u2014 last synced ${relativeTime(a.balanceUpdatedAt)}`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-green" />
                      {a.balanceUpdatedAt ? `Synced ${relativeTime(a.balanceUpdatedAt)}` : "Not synced"}
                    </>
                  )}
                  <Tooltip text="Account balance pulled from Plaid. Refreshes every 4 hours." />
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-2 flex items-center gap-1.5">
                Risk: {a.defaultRiskPct}% (
                <span className="font-mono">${riskAmt.toLocaleString()}</span>/trade)
                <Tooltip text="The percentage of your account balance risked per trade. 1% means you'll lose at most this amount if stopped out." />
              </p>
            </Card>
          );
        })}
      </div>

      {/* New Trade Button */}
      <Link
        href="/evaluate"
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        New Trade Evaluation
      </Link>

      {/* Recent Evaluations */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Recent Evaluations</h2>
        {recentEvals.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No evaluations yet. Start your first trade evaluation above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 pr-4">Asset</th>
                  <th className="text-left py-2 pr-4">Dir</th>
                  <th className="text-left py-2 pr-4">TF</th>
                  <th className="text-left py-2 pr-4">
                    <span className="flex items-center gap-1">
                      Score
                      <Tooltip text="Composite checklist score (0-100). Weighted sum of all factors. 75+ = high conviction, 50-74 = moderate, below 50 = low." position="bottom" />
                    </span>
                  </th>
                  <th className="text-left py-2 pr-4">Signal</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentEvals.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                    <td className="py-3 pr-4 font-mono font-medium text-text-primary">
                      <Link href={`/evaluate/${e.id}`} className="hover:underline">
                        {e.ticker}
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={e.direction === "LONG" ? "text-signal-green" : "text-signal-red"}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">{e.timeframe}</td>
                    <td className="py-3 pr-4 font-mono">{e.compositeScore}</td>
                    <td className="py-3 pr-4">
                      <SignalDot level={e.signal} />
                    </td>
                    <td className="py-3 pr-4 text-text-secondary">{formatStatus(e.status)}</td>
                    <td className="py-3 text-right text-text-muted">{relativeTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Open Trades */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-4">Open Trades</h2>
        {openTrades.length === 0 ? (
          <p className="text-sm text-text-muted py-4">No open trades right now.</p>
        ) : (
          openTrades.map((t) => {
            const target = firstTarget(t.targetsJson);
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-b border-border/50 last:border-0"
              >
                <span className="font-mono font-medium text-text-primary">{t.ticker}</span>
                <span className={`text-sm ${t.direction === "LONG" ? "text-signal-green" : "text-signal-red"}`}>
                  {t.direction}
                </span>
                <div className="flex gap-4 text-sm text-text-secondary">
                  <span>
                    Entry: <span className="font-mono text-text-primary">${t.entryPrice.toLocaleString()}</span>
                  </span>
                  <span>
                    Stop: <span className="font-mono text-signal-red">${t.stopLoss.toLocaleString()}</span>
                  </span>
                  {target !== null && (
                    <span>
                      Target: <span className="font-mono text-signal-green">${target.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <span className="text-sm text-text-secondary flex items-center gap-1">
                  Score: <span className="font-mono">{t.compositeScore}</span>
                  <Tooltip text="Composite checklist score (0-100) at time of evaluation." />
                </span>
                <Link
                  href={`/evaluate/${t.id}/outcome`}
                  className="ml-auto text-sm px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-border text-text-primary transition-colors"
                >
                  Log Outcome
                </Link>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
