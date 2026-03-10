"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/Card";

interface AssetRow {
  id: number;
  ticker: string;
  name: string;
  assetClass: string;
  exchange: string | null;
  active: number;
  createdAt: string;
}

const filters = ["All", "crypto", "equity", "commodity"];
const filterLabels: Record<string, string> = {
  All: "All",
  crypto: "Crypto",
  equity: "Equity",
  commodity: "Commodity",
};

const classBadge: Record<string, string> = {
  crypto: "bg-primary/10 text-primary",
  equity: "bg-signal-green/10 text-signal-green",
  commodity: "bg-signal-yellow/10 text-signal-yellow",
};

export default function AssetsPage() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addStatus, setAddStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [newAsset, setNewAsset] = useState({ ticker: "", name: "", assetClass: "equity", exchange: "" });

  const fetchAssets = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "All") params.set("class", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/assets?${params}`);
      if (!res.ok) throw new Error("Failed to load assets");
      const data = await res.json();
      setAssets(data);
    } catch {
      setError("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleAdd = async () => {
    if (!newAsset.ticker || !newAsset.name) return;
    setAddStatus(null);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: newAsset.ticker.toUpperCase(),
          name: newAsset.name,
          assetClass: newAsset.assetClass,
          exchange: newAsset.exchange || null,
        }),
      });
      if (res.ok) {
        setNewAsset({ ticker: "", name: "", assetClass: "equity", exchange: "" });
        setShowAdd(false);
        setAddStatus({ type: "success", message: `${newAsset.ticker.toUpperCase()} added successfully.` });
        fetchAssets();
        setTimeout(() => setAddStatus(null), 3000);
      } else {
        const body = await res.json().catch(() => null);
        setAddStatus({ type: "error", message: body?.error ?? "Failed to add asset." });
      }
    } catch {
      setAddStatus({ type: "error", message: "Failed to add asset. Please try again." });
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Assets</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors"
        >
          + Add Asset
        </button>
      </div>

      {addStatus && (
        <p className={`text-sm ${addStatus.type === "success" ? "text-signal-green" : "text-signal-red"}`}>
          {addStatus.message}
        </p>
      )}

      {showAdd && (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Ticker (e.g. AAPL)"
              value={newAsset.ticker}
              onChange={(e) => setNewAsset({ ...newAsset, ticker: e.target.value })}
              className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              placeholder="Name (e.g. Apple Inc.)"
              value={newAsset.name}
              onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={newAsset.assetClass}
              onChange={(e) => setNewAsset({ ...newAsset, assetClass: e.target.value })}
              className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="equity">Equity</option>
              <option value="crypto">Crypto</option>
              <option value="commodity">Commodity</option>
            </select>
            <input
              placeholder="Exchange (optional)"
              value={newAsset.exchange}
              onChange={(e) => setNewAsset({ ...newAsset, exchange: e.target.value })}
              className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            <button onClick={handleAdd} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold">
              Save
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {filters.map((f) => (
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
        <input
          type="text"
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary w-56"
        />
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-wider border-b border-border">
              <th className="text-left py-3 px-5">Ticker</th>
              <th className="text-left py-3 px-5">Name</th>
              <th className="text-left py-3 px-5">Class</th>
              <th className="text-left py-3 px-5">Exchange</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-3 px-5"><div className="h-4 w-16 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-32 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-16 bg-surface-hover rounded animate-pulse" /></td>
                  <td className="py-3 px-5"><div className="h-4 w-20 bg-surface-hover rounded animate-pulse" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={4} className="py-8 text-center">
                  <p className="text-signal-red mb-2">{error}</p>
                  <button onClick={fetchAssets} className="text-sm text-text-secondary hover:text-text-primary transition-colors">Retry</button>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center">
                  <p className="text-text-muted mb-1">No assets found.</p>
                  <button onClick={() => setShowAdd(true)} className="text-sm text-primary hover:text-primary-hover transition-colors">Add your first asset &rarr;</button>
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                  <td className="py-3 px-5">
                    <Link
                      href={`/assets/${a.id}`}
                      className="font-mono font-medium text-text-primary hover:text-primary transition-colors"
                    >
                      {a.ticker}
                    </Link>
                  </td>
                  <td className="py-3 px-5 text-text-secondary">{a.name}</td>
                  <td className="py-3 px-5">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${classBadge[a.assetClass] ?? ""}`}>
                      {a.assetClass}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-text-secondary">{a.exchange ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
