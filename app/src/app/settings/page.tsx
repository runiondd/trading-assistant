"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePlaidLink } from "react-plaid-link";
import Card from "@/components/Card";
import Tooltip from "@/components/Tooltip";

type Tab = "accounts" | "checklist" | "apikeys";

interface Account {
  id: number;
  name: string;
  balance: number;
  accountType: string;
  defaultRiskPct: number;
  plaidAccountId: string | null;
  plaidAccessToken: string | null;
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

function isStaleBalance(balanceUpdatedAt: string | null): boolean {
  if (!balanceUpdatedAt) return true;
  const fourHours = 4 * 60 * 60 * 1000;
  return Date.now() - new Date(balanceUpdatedAt).getTime() > fourHours;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ─── Plaid Link wrapper ─── */
function PlaidLinkButton({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLinkToken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        onError(body?.error ?? "Failed to initialize Plaid. Check your API keys.");
        setLoading(false);
        return;
      }
      const { linkToken } = await res.json();
      setLinkToken(linkToken);
    } catch {
      onError("Failed to connect to Plaid service.");
      setLoading(false);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          onError(body?.error ?? "Failed to link account.");
        } else {
          onSuccess();
        }
      } catch {
        onError("Failed to exchange Plaid token.");
      } finally {
        setLinkToken(null);
        setLoading(false);
      }
    },
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <button
      onClick={fetchLinkToken}
      disabled={loading}
      className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
    >
      {loading ? "Connecting..." : "Connect with Plaid"}
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddFactor, setShowAddFactor] = useState(false);
  const [newFactor, setNewFactor] = useState({ name: "", weight: 10, scoreType: "pass_fail" });
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: "", accountType: "taxable", balance: "" });
  const [refreshingIds, setRefreshingIds] = useState<Set<number>>(new Set());
  const [apiKeyValues, setApiKeyValues] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Debounce timers for account field updates
  const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      if (res.ok) {
        const keys: { name: string; maskedValue: string }[] = await res.json();
        const masked: Record<string, string> = {};
        for (const k of keys) masked[k.name] = k.maskedValue;
        setSavedKeys(masked);
      }
    } catch {
      // Ignore — table may not exist yet
    }
  }, []);

  const saveApiKey = async (name: string) => {
    const value = apiKeyValues[name];
    if (!value?.trim()) return;
    setSavingKey(name);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, value: value.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedKeys((prev) => ({ ...prev, [name]: data.maskedValue }));
        setApiKeyValues((prev) => ({ ...prev, [name]: "" }));
        showActionFeedback("success", `${name === "anthropic" ? "Anthropic" : "Unusual Whales"} key saved.`);
      } else {
        showActionFeedback("error", "Failed to save key.");
      }
    } catch {
      showActionFeedback("error", "Failed to save key.");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteApiKey = async (name: string) => {
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setSavedKeys((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
        showActionFeedback("success", "Key deleted.");
      }
    } catch {
      showActionFeedback("error", "Failed to delete key.");
    }
  };

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([fetchFactors(), fetchAccounts(), fetchApiKeys()]);
    } catch {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [fetchFactors, fetchAccounts, fetchApiKeys]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ─── Account mutations ─── */

  const updateAccount = useCallback(
    async (id: number, field: string, value: string | number) => {
      // Optimistic update
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
      );

      // Debounce the API call
      const key = `${id}-${field}`;
      if (updateTimers.current[key]) clearTimeout(updateTimers.current[key]);

      updateTimers.current[key] = setTimeout(async () => {
        try {
          const res = await fetch(`/api/accounts/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          });
          if (!res.ok) showActionFeedback("error", `Failed to update ${field}.`);
        } catch {
          showActionFeedback("error", `Failed to update ${field}.`);
        }
      }, 500);
    },
    []
  );

  const refreshBalance = async (id: number) => {
    setRefreshingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/accounts/${id}/refresh`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, balance: updated.balance, balanceUpdatedAt: updated.balanceUpdatedAt } : a)));
        showActionFeedback("success", "Balance refreshed.");
      } else {
        const body = await res.json().catch(() => null);
        showActionFeedback("error", body?.error ?? "Failed to refresh balance.");
      }
    } catch {
      showActionFeedback("error", "Failed to refresh balance.");
    } finally {
      setRefreshingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const unlinkPlaid = async (id: number) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plaidAccountId: null, plaidAccessToken: null, balanceUpdatedAt: null }),
      });
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, plaidAccountId: null, plaidAccessToken: null, balanceUpdatedAt: null } : a
          )
        );
        showActionFeedback("success", "Plaid disconnected.");
      } else {
        showActionFeedback("error", "Failed to unlink Plaid.");
      }
    } catch {
      showActionFeedback("error", "Failed to unlink Plaid.");
    }
  };

  const addAccount = async () => {
    if (!newAccount.name || !newAccount.balance) return;
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccount.name,
          accountType: newAccount.accountType,
          balance: parseFloat(newAccount.balance),
        }),
      });
      if (res.ok) {
        setNewAccount({ name: "", accountType: "taxable", balance: "" });
        setShowAddAccount(false);
        fetchAccounts();
        showActionFeedback("success", "Account added.");
      } else {
        const body = await res.json().catch(() => null);
        showActionFeedback("error", body?.error ?? "Failed to add account.");
      }
    } catch {
      showActionFeedback("error", "Failed to add account.");
    }
  };

  /* ─── Checklist mutations ─── */

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
        {(["accounts", "checklist", "apikeys"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {t === "accounts" ? "Accounts" : t === "checklist" ? "Checklist" : "API Keys"}
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
            accounts.map((a) => {
              const stale = a.plaidAccountId && isStaleBalance(a.balanceUpdatedAt);
              const refreshing = refreshingIds.has(a.id);

              return (
                <Card key={a.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{a.name}</h3>
                      <p className="text-2xl font-bold font-mono text-text-primary mt-1">
                        ${a.balance.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-text-muted">
                        {a.plaidAccountId ? (
                          <>
                            <span className={`w-1.5 h-1.5 rounded-full ${stale ? "bg-signal-yellow" : "bg-signal-green"}`} />
                            {stale
                              ? `Stale — last synced ${a.balanceUpdatedAt ? timeAgo(a.balanceUpdatedAt) : "never"}`
                              : `Synced ${a.balanceUpdatedAt ? timeAgo(a.balanceUpdatedAt) : "never"}`}
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                            Manual entry
                          </>
                        )}
                        <Tooltip text="Plaid securely connects to your brokerage to pull account balances and positions. Your credentials are never stored." />
                      </span>
                      {a.plaidAccountId && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => refreshBalance(a.id)}
                            disabled={refreshing}
                            className="text-xs text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
                          >
                            {refreshing ? "Refreshing..." : "Refresh"}
                          </button>
                          <span className="text-text-muted">|</span>
                          <button
                            onClick={() => unlinkPlaid(a.id)}
                            className="text-xs text-text-muted hover:text-signal-red transition-colors"
                          >
                            Unlink
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                        Account Type
                      </label>
                      <select
                        value={a.accountType}
                        onChange={(e) => updateAccount(a.id, "accountType", e.target.value)}
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
                        value={a.defaultRiskPct}
                        onChange={(e) => updateAccount(a.id, "defaultRiskPct", parseFloat(e.target.value) || 0)}
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

                  {!a.plaidAccountId && (
                    <div>
                      <label className="block text-xs text-text-muted mb-1 uppercase tracking-wider">
                        Balance
                      </label>
                      <input
                        type="number"
                        value={a.balance}
                        onChange={(e) => updateAccount(a.id, "balance", parseFloat(e.target.value) || 0)}
                        className="w-40 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </Card>
              );
            })
          )}

          <PlaidLinkButton
            onSuccess={() => {
              fetchAccounts();
              showActionFeedback("success", "Account connected via Plaid.");
            }}
            onError={(msg) => showActionFeedback("error", msg)}
          />

          {showAddAccount ? (
            <Card>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Add Account Manually</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Account name"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={newAccount.accountType}
                  onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value })}
                  className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="taxable">Taxable</option>
                  <option value="ira">IRA</option>
                  <option value="roth">Roth IRA</option>
                </select>
                <input
                  type="number"
                  placeholder="Balance"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                  className="bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowAddAccount(false)}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={addAccount}
                  className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </Card>
          ) : (
            <button
              onClick={() => setShowAddAccount(true)}
              className="w-full py-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
            >
              Add Account Manually
            </button>
          )}
        </div>
      )}

      {tab === "apikeys" && !error && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            API keys are stored locally in your SQLite database and never transmitted to external servers.
          </p>

          {[
            { name: "anthropic", label: "Anthropic API Key", placeholder: "sk-ant-..." },
            { name: "unusual_whales", label: "Unusual Whales API Key", placeholder: "Your UW key" },
          ].map(({ name, label, placeholder }) => (
            <Card key={name}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-text-primary">{label}</label>
                {savedKeys[name] && (
                  <span className="text-xs font-mono text-text-muted">{savedKeys[name]}</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyValues[name] ?? ""}
                  onChange={(e) => setApiKeyValues((prev) => ({ ...prev, [name]: e.target.value }))}
                  placeholder={savedKeys[name] ? "Enter new key to replace" : placeholder}
                  className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => saveApiKey(name)}
                  disabled={!apiKeyValues[name]?.trim() || savingKey === name}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingKey === name ? "Saving..." : "Save"}
                </button>
                {savedKeys[name] && (
                  <button
                    onClick={() => deleteApiKey(name)}
                    className="px-3 py-2 rounded-lg text-sm text-text-muted hover:text-signal-red transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Card>
          ))}
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
