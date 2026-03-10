"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/Card";
import Tooltip from "@/components/Tooltip";

type Tab = "accounts" | "checklist";

interface Account {
  id: number;
  name: string;
  balance: number;
  accountType: string;
  defaultRiskPct: number;
  plaidAccountId: string | null;
  balanceUpdatedAt: string | null;
}

interface Factor {
  id: number;
  name: string;
  description: string | null;
  scoreType: string;
  weight: number;
  configJson: string | null;
  sortOrder: number;
}

const typeBadge: Record<string, string> = {
  scale: "bg-primary/10 text-primary",
  pass_fail: "bg-signal-green/10 text-signal-green",
  numeric: "bg-signal-yellow/10 text-signal-yellow",
};

const typeLabels: Record<string, string> = {
  scale: "Scale",
  pass_fail: "Pass/Fail",
  numeric: "Numeric",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [newFactor, setNewFactor] = useState({ name: "", weight: 10, scoreType: "pass_fail" });

  const showActionFeedback = (type: "success" | "error", message: string) => {
    setActionStatus({ type, message });
    if (type === "success") setTimeout(() => setActionStatus(null), 3000);
  };

  const fetchFactors = useCallback(async () => {
    const res = await fetch("/api/checklist");
    if (res.ok) setFactors(await res.json());
  }, []);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    if (res.ok) setAccounts(await res.json());
  }, []);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchFactors(), fetchAccounts()]);
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [fetchFactors, fetchAccounts]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateWeight = async (id: number, weight: number) => {
    setFactors((prev) => prev.map((f) => (f.id === id ? { ...f, weight } : f)));
    try {
      const res = await fetch(`/api/checklist/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight }),
      });
      if (!res.ok) showActionFeedback("error", "Failed to update weight.");
    } catch {
      showActionFeedback("error", "Failed to update weight.");
    }
  };

  const deleteFactor = async (id: number) => {
    try {
      const res = await fetch(`/api/checklist/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFactors((prev) => prev.filter((f) => f.id !== id));
        showActionFeedback("success", "Factor deleted.");
      } else {
        showActionFeedback("error", "Failed to delete factor.");
      }
    } catch {
      showActionFeedback("error", "Failed to delete factor.");
    }
  };

  const addFactor = async () => {
    if (!newFactor.name) return;
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFactor),
      });
      if (res.ok) {
        setNewFactor({ name: "", weight: 10, scoreType: "pass_fail" });
        setShowAddFactor(false);
        fetchFactors();
        showActionFeedback("success", "Factor added.");
      } else {
        const body = await res.json().catch(() => null);
        showActionFeedback("error", body?.error ?? "Failed to add factor.");
      }
    } catch {
      showActionFeedback("error", "Failed to add factor.");
    }
  };

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["accounts", "checklist"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t === "accounts" ? "Accounts" : "Checklist"}
          </button>
        ))}
      </div>

      {actionStatus && (
        <p className={`text-sm ${actionStatus.type === "success" ? "text-signal-green" : "text-signal-red"}`}>
          {actionStatus.message}
        </p>
      )}

      {error && (
        <Card>
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-signal-red font-semibold">{error}</p>
            <button
              onClick={fetchAll}
              className="px-4 py-2 rounded-lg bg-surface-hover hover:bg-border text-text-primary text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {tab === "accounts" && !error && (
        <div className="space-y-4">
          {loading ? (
            [1, 2].map((i) => (
              <Card key={i}>
                <div className="animate-pulse space-y-3">
                  <div className="h-5 w-32 bg-surface-hover rounded" />
                  <div className="h-8 w-40 bg-surface-hover rounded" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-9 bg-surface-hover rounded" />
                    <div className="h-9 bg-surface-hover rounded" />
                    <div className="h-9 bg-surface-hover rounded" />
                  </div>
                </div>
              </Card>
            ))
          ) : accounts.length === 0 ? (
            <Card>
              <p className="text-text-muted text-center py-8">No accounts configured. Connect with Plaid or add one manually below.</p>
            </Card>
          ) : (
            accounts.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{a.name}</h3>
                    <p className="text-2xl font-bold font-mono text-text-primary mt-1">
                      ${a.balance.toLocaleString()}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    {a.plaidAccountId ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-signal-green" />
                        Plaid synced {a.balanceUpdatedAt ? new Date(a.balanceUpdatedAt).toLocaleString() : "never"}
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                        Manual entry
                      </>
                    )}
                    <Tooltip text="Plaid securely connects to your brokerage to pull account balances and positions. Your credentials are never stored." />
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                      Account Type
                    </label>
                    <select
                      defaultValue={a.accountType}
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="taxable">Taxable</option>
                      <option value="ira">IRA</option>
                      <option value="roth">Roth IRA</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 uppercase tracking-wider flex items-center gap-1.5">
                      Risk %
                      <Tooltip text="Maximum percentage of this account risked per trade. 1% is the professional standard." />
                    </label>
                    <input
                      type="number"
                      defaultValue={a.defaultRiskPct}
                      step="0.25"
                      min="0.25"
                      max="5"
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                      Risk $ / Trade
                    </label>
                    <div className="h-[38px] flex items-center text-lg font-bold font-mono text-text-primary">
                      ${(a.balance * (a.defaultRiskPct / 100)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}

          <button className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors">
            Connect with Plaid
          </button>
          <button className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            Add Account Manually
          </button>
        </div>
      )}

      {tab === "checklist" && !error && (
        <div className="space-y-4">
          {loading ? (
            <Card className="!p-0 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border/50 animate-pulse">
                  <div className="h-4 w-4 bg-surface-hover rounded" />
                  <div className="h-4 w-4 bg-surface-hover rounded" />
                  <div className="h-4 w-40 bg-surface-hover rounded flex-1" />
                  <div className="h-4 w-16 bg-surface-hover rounded" />
                  <div className="h-6 w-16 bg-surface-hover rounded" />
                  <div className="h-4 w-4 bg-surface-hover rounded" />
                </div>
              ))}
            </Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="space-y-0">
                {factors.map((f, idx) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-border/50 hover:bg-surface-hover/30 transition-colors"
                  >
                    <span className="text-text-muted cursor-grab select-none text-lg leading-none">
                      &#8801;
                    </span>
                    <span className="text-xs font-mono text-text-muted w-5">{idx + 1}</span>
                    <div className="flex-1">
                      <span className="text-sm text-text-primary">{f.name}</span>
                      {f.description && (
                        <p className="text-xs text-text-muted mt-0.5">{f.description}</p>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${typeBadge[f.scoreType] ?? ""}`}>
                        {typeLabels[f.scoreType] ?? f.scoreType}
                      </span>
                      {idx === 0 && (
                        <Tooltip text="Pass/Fail: binary yes/no. Scale: multiple levels (e.g., strong/moderate/weak). Numeric: calculated from a value." />
                      )}
                    </span>
                    <input
                      type="number"
                      value={f.weight}
                      onChange={(e) => updateWeight(f.id, parseInt(e.target.value) || 0)}
                      min={0}
                      max={25}
                      className="w-16 bg-surface-hover border border-border rounded-lg px-2 py-1 text-sm font-mono text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => deleteFactor(f.id)}
                      className="text-text-muted hover:text-signal-red text-sm transition-colors"
                      title="Delete factor"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {showAddFactor && (
            <Card>
              <div className="grid grid-cols-3 gap-3">
                <input
                  placeholder="Factor name"
                  value={newFactor.name}
                  onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                  className="col-span-2 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={newFactor.scoreType}
                  onChange={(e) => setNewFactor({ ...newFactor, scoreType: e.target.value })}
                  className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="pass_fail">Pass/Fail</option>
                  <option value="scale">Scale</option>
                  <option value="numeric">Numeric</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowAddFactor(false)} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                <button onClick={addFactor} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold">Save</button>
              </div>
            </Card>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-text-secondary flex items-center gap-1.5">
              Total Weight:{" "}
              <span
                className={`font-mono font-bold ${
                  totalWeight === 100 ? "text-signal-green" : "text-signal-red"
                }`}
              >
                {totalWeight}
              </span>
              <span className="text-text-muted"> / 100</span>
              <Tooltip text="How much each factor contributes to the total score. Higher weight = more influence. Weights should total 100." />
            </span>
            <button
              onClick={() => setShowAddFactor(!showAddFactor)}
              className="text-sm px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium transition-colors"
            >
              Add Factor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
