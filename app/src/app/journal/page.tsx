"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/Card";
import { SignalDot, type SignalLevel } from "@/components/SignalBadge";
import Tooltip from "@/components/Tooltip";

interface JournalEntry {
  id: number;
  direction: string;
  timeframe: string;
  compositeScore: number | null;
  signal: string | null;
  status: string;
  entryPrice: number;
  stopLoss: number;
  targetsJson: string;
  positionSize: number | null;
  overridesJson: string | null;
  createdAt: string;
  ticker: string;
  assetName: string;
  outcome: {
    actualEntry: number;
    actualExit: number;
    pnl: number;
    notes: string | null;
    closedAt: string;
  } | null;
}

const filterOptions = ["All", "confirmed", "passed"] as const;
const filterLabels: Record<string, string> = {
  All: "All",
  confirmed: "Open",
  passed: "Passed",
};

export default function JournalPage() {
  const [filter, setFilter] = useState<string>("All");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalEntry, setModalEntry] = useState<JournalEntry | null>(null);
  const [actEntry, setActEntry] = useState("");
  const [actExit, setActExit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "All") params.set("status", filter);
      const res = await fetch(`/api/journal?${params}`);
      if (!res.ok) throw new Error();
      setEntries(await res.json());
    } catch {
      setError("Failed to load journal entries.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const actEntryNum = parseFloat(actEntry) || 0;
  const actExitNum = parseFloat(actExit) || 0;
  const calcPnl = actEntryNum && actExitNum
    ? modalEntry?.direction === "long"
      ? (actExitNum - actEntryNum) * (modalEntry?.positionSize ?? 1)
      : (actEntryNum - actExitNum) * (modalEntry?.positionSize ?? 1)
    : 0;

  const handleSaveOutcome = async () => {
    if (!modalEntry || !actEntryNum || !actExitNum) return;
    setSaving(true);
    setOutcomeError(null);
    try {
      const res = await fetch(`/api/evaluations/${modalEntry.id}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualEntry: actEntryNum,
          actualExit: actExitNum,
          pnl: calcPnl,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        setModalEntry(null);
        fetchEntries();
      } else {
        const body = await res.json().catch(() => null);
        setOutcomeError(body?.error ?? "Failed to save outcome.");
      }
    } catch {
      setOutcomeError("Failed to save outcome. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openModal = (entry: JournalEntry) => {
    setModalEntry(entry);
    setActEntry(String(entry.entryPrice));
    setActExit("");
    setNotes("");
  };

  const getDisplayStatus = (e: JournalEntry) => {
    if (e.outcome) return "Closed";
    if (e.status === "confirmed") return "Open";
    if (e.status === "passed") return "Passed";
    return e.status;
  };

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Trade Journal</h1>

      <div className="flex gap-1.5">
        {filterOptions.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-surface-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="text-left py-3 px-5">Date</th>
              <th className="text-left py-3 px-5">Asset</th>
              <th className="text-left py-3 px-5">Dir</th>
              <th className="text-left py-3 px-5">TF</th>
              <th className="text-left py-3 px-5">
                <span className="flex items-center gap-1">
                  Score
                  <Tooltip text="The composite checklist score at the time of evaluation." position="bottom" />
                </span>
              </th>
              <th className="text-left py-3 px-5">Status</th>
              <th className="text-right py-3 px-5">
                <span className="flex items-center justify-end gap-1">
                  P&L
                  <Tooltip text="Profit or loss from the trade." position="bottom" />
                </span>
              </th>
              <th className="text-right py-3 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-5"><div className="h-4 w-16 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-12 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-10 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-8 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-10 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-12 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-16 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-20 bg-surface-hover rounded animate-pulse" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-8 text-center">
                  <p className="text-signal-red mb-2">{error}</p>
                  <button onClick={fetchEntries} className="text-sm text-text-secondary hover:text-text-primary transition-colors">Retry</button>
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <p className="text-text-muted mb-1">No trades yet.</p>
                  <a href="/evaluate" className="text-sm text-primary hover:text-primary-hover transition-colors">Start your first evaluation &rarr;</a>
                </td>
              </tr>
            ) : (
              entries.map((e) => {
                const displayStatus = getDisplayStatus(e);
                return (
                  <tr
                    key={e.id}
                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                  >
                    <td className="py-3 px-5 text-text-secondary font-mono text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5 font-mono font-medium text-text-primary">{e.ticker}</td>
                    <td className="py-3 px-5">
                      <span className={e.direction === "long" ? "text-signal-green" : "text-signal-red"}>
                        {e.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-text-secondary">{e.timeframe}</td>
                    <td className="py-3 px-5">
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <SignalDot level={(e.signal as SignalLevel) ?? "red"} />
                        {e.compositeScore != null ? Math.round(e.compositeScore) : "—"}
                        {e.overridesJson && (() => {
                          try {
                            const count = Object.keys(JSON.parse(e.overridesJson)).length;
                            return count > 0 ? (
                              <Tooltip text={`${count} factor${count > 1 ? "s" : ""} overridden from system suggestion`}>
                                <span className="text-[10px] px-1 py-0.5 rounded bg-signal-yellow/15 text-signal-yellow">
                                  {count} override{count > 1 ? "s" : ""}
                                </span>
                              </Tooltip>
                            ) : null;
                          } catch { return null; }
                        })()}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          displayStatus === "Open"
                            ? "bg-primary/10 text-primary"
                            : displayStatus === "Closed"
                            ? "bg-surface-hover text-text-secondary"
                            : "bg-text-muted/10 text-text-muted"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-mono">
                      {e.outcome ? (
                        <span className={e.outcome.pnl >= 0 ? "text-signal-green" : "text-signal-red"}>
                          {e.outcome.pnl >= 0 ? "+" : ""}${Math.abs(e.outcome.pnl).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-text-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {e.status === "confirmed" && !e.outcome && (
                        <button
                          onClick={() => openModal(e)}
                          className="text-xs px-3 py-1 rounded-lg bg-surface-hover hover:bg-border text-text-primary transition-colors"
                        >
                          Log Outcome
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Log Outcome Modal */}
      {modalEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Log Outcome &mdash; {modalEntry.ticker} {modalEntry.direction.toUpperCase()}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                  Rec. Entry
                </label>
                <div className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-muted">
                  ${modalEntry.entryPrice.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                  Rec. Target
                </label>
                <div className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-muted">
                  ${(() => {
                    try {
                      const targets = JSON.parse(modalEntry.targetsJson);
                      return targets[0]?.toLocaleString() ?? "—";
                    } catch {
                      return "—";
                    }
                  })()}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                  Actual Entry
                </label>
                <input
                  type="number"
                  value={actEntry}
                  onChange={(e) => setActEntry(e.target.value)}
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                  Actual Exit
                </label>
                <input
                  type="number"
                  value={actExit}
                  onChange={(e) => setActExit(e.target.value)}
                  placeholder="Enter exit price"
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {actExitNum > 0 && (
              <div className="p-3 rounded-lg bg-surface-hover">
                <span className="text-xs text-text-muted uppercase tracking-wider">P&L</span>
                <div className={`text-xl font-bold font-mono ${calcPnl >= 0 ? "text-signal-green" : "text-signal-red"}`}>
                  {calcPnl >= 0 ? "+" : ""}${Math.abs(Math.round(calcPnl)).toLocaleString()}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="What went well? What could improve?"
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {outcomeError && (
              <p className="text-sm text-signal-red">{outcomeError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setModalEntry(null); setOutcomeError(null); }}
                className="flex-1 py-2.5 rounded-lg bg-surface-hover hover:bg-border text-text-primary text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutcome}
                disabled={saving || !actExitNum}
                className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
