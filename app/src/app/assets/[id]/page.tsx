"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Card from "@/components/Card";
import Tooltip from "@/components/Tooltip";

interface AssetRow {
  id: number;
  ticker: string;
  name: string;
  assetClass: string;
  exchange: string | null;
}

interface LevelRow {
  id: number;
  assetId: number;
  price: number;
  label: string;
  levelType: string;
  active: number;
  createdAt: string;
}

function calcFibLevels(high: number, low: number) {
  const diff = high - low;
  return [
    { pct: "23.6%", price: high - diff * 0.236, label: "Fib 23.6%" },
    { pct: "38.2%", price: high - diff * 0.382, label: "Fib 38.2%" },
    { pct: "50.0%", price: high - diff * 0.5, label: "Fib 50.0%" },
    { pct: "61.8%", price: high - diff * 0.618, label: "Fib 61.8%" },
    { pct: "78.6%", price: high - diff * 0.786, label: "Fib 78.6%" },
  ];
}

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params.id as string;

  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [swingHigh, setSwingHigh] = useState("");
  const [swingLow, setSwingLow] = useState("");
  const [showAddLevel, setShowAddLevel] = useState(false);
  const [newLevel, setNewLevel] = useState({ price: "", label: "", levelType: "manual" });

  const high = parseFloat(swingHigh) || 0;
  const low = parseFloat(swingLow) || 0;
  const fibLevels = high > low ? calcFibLevels(high, low) : [];

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [assetRes, levelsRes] = await Promise.all([
        fetch(`/api/assets/${assetId}`),
        fetch(`/api/assets/${assetId}/levels`),
      ]);
      if (assetRes.ok) setAsset(await assetRes.json());
      else if (assetRes.status === 404) setError("Asset not found.");
      else setError("Failed to load asset.");
      if (levelsRes.ok) setLevels(await levelsRes.json());
    } catch {
      setError("Failed to load asset data.");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showAction = (type: "success" | "error", message: string) => {
    setActionStatus({ type, message });
    if (type === "success") setTimeout(() => setActionStatus(null), 3000);
  };

  const addFibLevels = async () => {
    if (fibLevels.length === 0) return;
    try {
      const res = await fetch(`/api/assets/${assetId}/levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levels: fibLevels.map((f) => ({
            price: Math.round(f.price * 100) / 100,
            label: f.label,
            level_type: "fibonacci",
          })),
        }),
      });
      if (res.ok) {
        fetchData();
        setSwingHigh("");
        setSwingLow("");
        showAction("success", "Fibonacci levels added.");
      } else {
        showAction("error", "Failed to add Fibonacci levels.");
      }
    } catch {
      showAction("error", "Failed to add Fibonacci levels.");
    }
  };

  const addManualLevel = async () => {
    const price = parseFloat(newLevel.price);
    if (!price || !newLevel.label) return;
    try {
      const res = await fetch(`/api/assets/${assetId}/levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, label: newLevel.label, level_type: newLevel.levelType }),
      });
      if (res.ok) {
        setNewLevel({ price: "", label: "", levelType: "manual" });
        setShowAddLevel(false);
        fetchData();
        showAction("success", "Level added.");
      } else {
        const body = await res.json().catch(() => null);
        showAction("error", body?.error ?? "Failed to add level.");
      }
    } catch {
      showAction("error", "Failed to add level.");
    }
  };

  const toggleLevel = async (level: LevelRow) => {
    const newActive = level.active === 1 ? 0 : 1;
    setLevels((prev) => prev.map((l) => (l.id === level.id ? { ...l, active: newActive } : l)));
  };

  const deleteLevel = async (levelId: number) => {
    try {
      const res = await fetch(`/api/assets/${assetId}/levels?levelId=${levelId}`, { method: "DELETE" });
      if (res.ok) {
        setLevels((prev) => prev.filter((l) => l.id !== levelId));
      } else {
        showAction("error", "Failed to delete level.");
      }
    } catch {
      showAction("error", "Failed to delete level.");
    }
  };

  const clearFibLevels = async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/levels?type=fibonacci`, { method: "DELETE" });
      if (res.ok) {
        setLevels((prev) => prev.filter((l) => l.levelType !== "fibonacci"));
        showAction("success", "Fibonacci levels cleared.");
      } else {
        showAction("error", "Failed to clear Fibonacci levels.");
      }
    } catch {
      showAction("error", "Failed to clear Fibonacci levels.");
    }
  };

  const clearAllLevels = async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/levels?type=all`, { method: "DELETE" });
      if (res.ok) {
        setLevels([]);
        showAction("success", "All levels cleared.");
      } else {
        showAction("error", "Failed to clear levels.");
      }
    } catch {
      showAction("error", "Failed to clear levels.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-48 bg-surface-hover rounded" />
          <div className="h-4 w-64 bg-surface-hover rounded" />
        </div>
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <div className="h-4 w-24 bg-surface-hover rounded animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-3 border-b border-border/50 flex gap-4 animate-pulse">
              <div className="h-4 w-20 bg-surface-hover rounded" />
              <div className="h-4 w-32 bg-surface-hover rounded" />
              <div className="h-4 w-16 bg-surface-hover rounded" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-4xl">
        <Card>
          <div className="flex flex-col items-center py-12 gap-4">
            <p className="text-signal-red font-semibold">{error ?? "Asset not found."}</p>
            <button
              onClick={fetchData}
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
    <div className="max-w-4xl space-y-6">
      {actionStatus && (
        <p className={`text-sm ${actionStatus.type === "success" ? "text-signal-green" : "text-signal-red"}`}>
          {actionStatus.message}
        </p>
      )}

      <div>
        <h1 className="text-xl font-bold text-text-primary">
          {asset.ticker} &mdash; {asset.name}
        </h1>
        <p className="text-sm text-text-muted mt-1 capitalize">
          {asset.assetClass} {asset.exchange ? `\u2022 ${asset.exchange}` : ""} &bull; Support &amp; Resistance Levels
        </p>
      </div>

      {/* S/R Levels Table */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">S/R Levels</h2>
          <div className="flex gap-3">
            {levels.some((l) => l.levelType === "fibonacci") && (
              <button
                onClick={clearFibLevels}
                className="text-xs text-signal-red/70 hover:text-signal-red font-medium"
              >
                Clear Fibs
              </button>
            )}
            {levels.length > 0 && (
              <button
                onClick={clearAllLevels}
                className="text-xs text-signal-red/70 hover:text-signal-red font-medium"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setShowAddLevel(!showAddLevel)}
              className="text-xs text-primary hover:text-primary-hover font-medium"
            >
              + Add Level
            </button>
          </div>
        </div>

        {showAddLevel && (
          <div className="px-5 py-3 border-b border-border bg-surface-hover/30">
            <div className="flex gap-2 items-end">
              <input
                placeholder="Price"
                type="number"
                value={newLevel.price}
                onChange={(e) => setNewLevel({ ...newLevel, price: e.target.value })}
                className="bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-32"
              />
              <input
                placeholder="Label (e.g. Major Support)"
                value={newLevel.label}
                onChange={(e) => setNewLevel({ ...newLevel, label: e.target.value })}
                className="bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary flex-1"
              />
              <select
                value={newLevel.levelType}
                onChange={(e) => setNewLevel({ ...newLevel, levelType: e.target.value })}
                className="bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="manual">Manual</option>
                <option value="pivot">Pivot</option>
              </select>
              <button
                onClick={addManualLevel}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="text-left py-2.5 px-5">Price</th>
              <th className="text-left py-2.5 px-5">Label</th>
              <th className="text-left py-2.5 px-5">Type</th>
              <th className="text-left py-2.5 px-5">Status</th>
              <th className="text-right py-2.5 px-5"></th>
            </tr>
          </thead>
          <tbody>
            {levels.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-muted">
                  No levels yet. Add levels manually or use the Fib Calculator below.
                </td>
              </tr>
            ) : (
              levels.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                  <td className="py-2.5 px-5 font-mono font-medium text-text-primary">
                    ${l.price.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-5 text-text-secondary">{l.label}</td>
                  <td className="py-2.5 px-5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        l.levelType === "manual"
                          ? "bg-primary/10 text-primary"
                          : l.levelType === "pivot"
                          ? "bg-signal-green/10 text-signal-green"
                          : "bg-signal-yellow/10 text-signal-yellow"
                      }`}
                    >
                      {l.levelType === "manual" ? "Manual" : l.levelType === "pivot" ? "Pivot" : "Fibonacci"}
                    </span>
                  </td>
                  <td className="py-2.5 px-5">
                    <button
                      onClick={() => toggleLevel(l)}
                      className="flex items-center gap-1.5 text-xs cursor-pointer"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          l.active === 1 ? "bg-signal-green" : "bg-text-muted"
                        }`}
                      />
                      <span className={l.active === 1 ? "text-signal-green" : "text-text-muted"}>
                        {l.active === 1 ? "Active" : "Invalidated"}
                      </span>
                      {l.active === 0 && (
                        <Tooltip text="A level that price has broken through convincingly. Excluded from scoring." position="bottom" />
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <button
                      onClick={() => deleteLevel(l.id)}
                      className="text-xs text-text-muted hover:text-signal-red transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Fib Calculator */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5">
          Fibonacci Calculator
          <Tooltip text="Key retracement levels based on the Fibonacci sequence. Prices often react at these levels during pullbacks." />
        </h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              Swing High
              <Tooltip text="The recent peak used to calculate Fibonacci retracement levels." />
            </label>
            <input
              type="number"
              value={swingHigh}
              onChange={(e) => setSwingHigh(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              Swing Low
              <Tooltip text="The recent trough used to calculate Fibonacci retracement levels." />
            </label>
            <input
              type="number"
              value={swingLow}
              onChange={(e) => setSwingLow(e.target.value)}
              className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {fibLevels.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <h3 className="text-xs text-text-muted uppercase tracking-wider mb-2">Preview</h3>
            {fibLevels.map((f) => (
              <div
                key={f.pct}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface-hover/50"
              >
                <span className="text-xs text-text-secondary">{f.pct}</span>
                <span className="font-mono text-sm text-text-primary">
                  ${f.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addFibLevels}
          disabled={fibLevels.length === 0}
          className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Fib Levels
        </button>
      </Card>
    </div>
  );
}
