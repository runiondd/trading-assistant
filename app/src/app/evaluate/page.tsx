"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/Card";
import Tooltip from "@/components/Tooltip";
import TradingViewChart from "@/components/TradingViewChart";

interface AssetRow {
  id: number;
  ticker: string;
  name: string;
  assetClass: string;
}

interface AccountRow {
  id: number;
  name: string;
  balance: number;
  accountType: string;
  defaultRiskPct: number;
}

interface LevelRow {
  id: number;
  price: number;
  label: string;
  levelType: string;
  active: number;
}

interface FactorRow {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  scoreType: string;
  configJson: string | null;
  sortOrder: number;
}

const timeframes = ["Weekly", "Daily", "4h", "1h"];

function RadioPills({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-primary text-white"
              : "bg-surface-hover text-text-secondary hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => onChange("true")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          value === "true"
            ? "bg-signal-green/20 text-signal-green"
            : "bg-surface-hover text-text-secondary hover:text-text-primary"
        }`}
      >
        Yes
      </button>
      <button
        onClick={() => onChange("false")}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          value === "false"
            ? "bg-signal-red/20 text-signal-red"
            : "bg-surface-hover text-text-secondary hover:text-text-primary"
        }`}
      >
        No
      </button>
    </div>
  );
}

export default function EvaluatePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);

  // Data from API
  const [assetList, setAssetList] = useState<AssetRow[]>([]);
  const [accountList, setAccountList] = useState<AccountRow[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1 state
  const [assetId, setAssetId] = useState<number>(0);
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [timeframe, setTimeframe] = useState("4h");
  const [accountId, setAccountId] = useState<number>(0);
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");

  // Step 2 state — dynamic factor values keyed by factor ID
  const [factorValues, setFactorValues] = useState<Record<string, string>>({});
  // Track which values were auto-suggested by indicators (factorId → suggested value)
  const [autoSuggested, setAutoSuggested] = useState<Record<string, string>>({});

  // Indicator data from API
  const [indicators, setIndicators] = useState<{
    rsi: number | null;
    ema20: number | null;
    ema50: number | null;
    bb: { upper: number; middle: number; lower: number } | null;
    kc: { upper: number; middle: number; lower: number } | null;
    volumeAvg20: number | null;
    lastVolume: number | null;
    lastClose: number | null;
    squeeze: boolean;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<
    Record<string, { value: string; reason: string }>
  >({});
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/checklist").then((r) => r.json()),
    ]).then(([assets, accounts, checklist]) => {
      setAssetList(assets);
      setAccountList(accounts);
      setFactors(checklist);
      if (assets.length > 0) setAssetId(assets[0].id);
      if (accounts.length > 0) setAccountId(accounts[0].id);
      setLoading(false);
    });
  }, []);

  // Fetch levels and saved factor values when asset changes
  const fetchLevelsAndSavedFactors = useCallback(async () => {
    if (!assetId) return;
    const [levelsRes, savedRes] = await Promise.all([
      fetch(`/api/assets/${assetId}/levels`),
      fetch(`/api/assets/${assetId}/saved-factors`),
    ]);
    if (levelsRes.ok) setLevels(await levelsRes.json());
    if (savedRes.ok) {
      const saved: { factorId: number; value: string }[] = await savedRes.json();
      if (saved.length > 0) {
        const savedMap: Record<string, string> = {};
        for (const s of saved) {
          savedMap[String(s.factorId)] = s.value;
        }
        setFactorValues((prev) => {
          const merged = { ...prev };
          for (const [k, v] of Object.entries(savedMap)) {
            if (!prev[k]) merged[k] = v;
          }
          return merged;
        });
      }
    }
  }, [assetId]);

  useEffect(() => {
    fetchLevelsAndSavedFactors();
  }, [fetchLevelsAndSavedFactors]);

  // Mapping from API suggestion keys to factor name matchers
  const SUGGESTION_TO_FACTOR: Record<string, (name: string) => boolean> = {
    trend: (n) => n.includes("trend") && !n.includes("multi"),
    rsi: (n) => n.includes("rsi"),
    meanReversion: (n) => n.includes("mean"),
    srProximity: (n) => n.includes("support") || n.includes("s/r"),
    riskReward: (n) => n.includes("risk") || n.includes("r:r"),
    volume: (n) => n.includes("volume"),
    multiTf: (n) => n.includes("multi"),
    ira: (n) => n.includes("ira"),
  };

  // Fetch indicators when asset/timeframe/direction/entry/stop/target change (debounced)
  useEffect(() => {
    const asset = assetList.find((a) => a.id === assetId);
    if (!asset || !timeframe) return;

    const timer = setTimeout(() => {
      setIndicatorsLoading(true);
      const params = new URLSearchParams({
        ticker: asset.ticker,
        assetClass: asset.assetClass,
        timeframe,
        direction,
        entryPrice: entry || "0",
        stopLoss: stop || "0",
        target: target || "0",
        accountType: accountList.find((a) => a.id === accountId)?.accountType || "",
      });
      fetch(`/api/indicators?${params}`)
        .then((r) => r.json())
        .then((data) => {
        if (data.configured && data.indicators) {
          setIndicators(data.indicators);
          const sugg = data.suggestions ?? {};
          setSuggestions(sugg);

          // Auto-apply all suggestions to factor values (won't overwrite user choices)
          const autoApplied: Record<string, string> = {};
          for (const [key, suggestion] of Object.entries(sugg)) {
            const matcher = SUGGESTION_TO_FACTOR[key];
            if (!matcher) continue;
            const factor = factors.find((f) => matcher(f.name.toLowerCase()));
            if (factor) autoApplied[String(factor.id)] = (suggestion as { value: string }).value;
          }
          if (Object.keys(autoApplied).length > 0) {
            setAutoSuggested((prev) => ({ ...prev, ...autoApplied }));
            // Only auto-fill factors the user hasn't explicitly touched
            setFactorValues((prev) => {
              const merged = { ...prev };
              for (const [k, v] of Object.entries(autoApplied)) {
                if (!prev[k]) merged[k] = v;
              }
              return merged;
            });
          }
        }
      })
      .catch(() => {})
      .finally(() => setIndicatorsLoading(false));
    }, 500); // debounce 500ms

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, timeframe, direction, step, entry, stop, target, accountId]);

  const selectedAsset = assetList.find((a) => a.id === assetId);
  const selectedAccount = accountList.find((a) => a.id === accountId);
  const ticker = selectedAsset?.ticker ?? "";

  const entryNum = parseFloat(entry) || 0;
  const stopNum = parseFloat(stop) || 0;
  const targetNum = parseFloat(target) || 0;

  const rr = useMemo(() => {
    if (!entryNum || !stopNum || !targetNum) return 0;
    const risk = Math.abs(entryNum - stopNum);
    if (risk === 0) return 0;
    const reward = direction === "long" ? targetNum - entryNum : entryNum - targetNum;
    return reward / risk;
  }, [entryNum, stopNum, targetNum, direction]);

  const riskAmt = selectedAccount ? selectedAccount.balance * (selectedAccount.defaultRiskPct / 100) : 0;
  const riskPerShare = Math.abs(entryNum - stopNum);
  const shares = riskPerShare > 0 ? Math.floor(riskAmt / riskPerShare) : 0;
  const cost = shares * entryNum;

  const isIraShort =
    selectedAccount && (selectedAccount.accountType === "ira" || selectedAccount.accountType === "roth") && direction === "short";

  // Inline scoring preview for step 2
  const previewScore = useMemo(() => {
    let totalEarned = 0;
    let totalMax = 0;
    factors.forEach((f) => {
      const val = factorValues[String(f.id)];
      totalMax += f.weight;
      if (!val) return;
      if (f.scoreType === "pass_fail") {
        totalEarned += val === "true" ? f.weight : 0;
      } else if (f.scoreType === "scale") {
        const options = f.configJson ? JSON.parse(f.configJson).options as string[] : [];
        const idx = options.indexOf(val);
        if (idx >= 0 && options.length > 1) {
          totalEarned += (idx / (options.length - 1)) * f.weight;
        }
      } else if (f.scoreType === "numeric") {
        const num = parseFloat(val);
        if (num >= 2) totalEarned += f.weight;
        else if (num >= 1) totalEarned += f.weight * 0.5;
      }
    });
    return totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  }, [factors, factorValues]);

  const scoreColor =
    previewScore >= 75 ? "text-signal-green" : previewScore >= 50 ? "text-signal-yellow" : "text-signal-red";
  const barColor =
    previewScore >= 75 ? "bg-signal-green" : previewScore >= 50 ? "bg-signal-yellow" : "bg-signal-red";

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    // Auto-fill R:R as numeric factor value if applicable
    const rrFactorId = factors.find((f) => f.scoreType === "numeric");
    const finalValues = { ...factorValues };
    if (rrFactorId && !finalValues[String(rrFactorId.id)]) {
      finalValues[String(rrFactorId.id)] = String(rr);
    }

    // Compute overrides: factors where user changed the auto-suggested value
    const overrides: Record<string, { suggested: string; chosen: string }> = {};
    for (const [factorId, suggestedVal] of Object.entries(autoSuggested)) {
      const chosenVal = finalValues[factorId];
      if (chosenVal && chosenVal !== suggestedVal) {
        const factor = factors.find((f) => String(f.id) === factorId);
        overrides[factor?.name ?? factorId] = { suggested: suggestedVal, chosen: chosenVal };
      }
    }

    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId,
        accountId,
        direction,
        timeframe,
        entryPrice: entryNum,
        stopLoss: stopNum,
        targets: [targetNum],
        factorValues: finalValues,
        overrides: Object.keys(overrides).length > 0 ? overrides : null,
      }),
    });

    if (res.ok) {
      const data = await res.json();

      // Save Analyst Consensus factor value for persistence across evaluations
      const consensusFactor = factors.find((f) =>
        f.name.toLowerCase().includes("analyst") || f.name.toLowerCase().includes("consensus")
      );
      if (consensusFactor && finalValues[String(consensusFactor.id)]) {
        fetch(`/api/assets/${assetId}/saved-factors`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            factorId: consensusFactor.id,
            value: finalValues[String(consensusFactor.id)],
          }),
        }).catch(() => {}); // fire-and-forget
      }

      router.push(`/evaluate/result?id=${data.evaluation.id}`);
    } else {
      setSubmitting(false);
      alert("Failed to create evaluation. Check your inputs.");
    }
  };

  if (loading) {
    return <div className="text-text-muted p-8">Loading...</div>;
  }

  const activeLevels = levels.filter((l) => l.active === 1);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-xl font-bold text-text-primary">Trade Evaluation</h1>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1 ? "bg-primary text-white" : "bg-surface-hover text-text-muted"
            }`}
          >
            1
          </span>
          <span className="text-text-muted">Setup</span>
          <span className="w-8 h-px bg-border" />
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2 ? "bg-primary text-white" : "bg-surface-hover text-text-muted"
            }`}
          >
            2
          </span>
          <span className="text-text-muted">Score</span>
        </div>
      </div>

      {step === 1 && (
        <>
          <TradingViewChart symbol={ticker} interval={timeframe} height={700} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <h2 className="text-base font-semibold text-text-primary mb-4">Trade Setup</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Asset */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Asset</label>
                    <select
                      value={assetId}
                      onChange={(e) => setAssetId(Number(e.target.value))}
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {assetList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.ticker} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      Direction
                      <Tooltip text="Long = betting the price will go up. Short = betting it will go down." />
                    </label>
                    <div className="flex gap-1.5">
                      {(["long", "short"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDirection(d)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors uppercase ${
                            direction === d
                              ? d === "long"
                                ? "bg-signal-green/20 text-signal-green"
                                : "bg-signal-red/20 text-signal-red"
                              : "bg-surface-hover text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeframe */}
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      Timeframe
                      <Tooltip text="The chart timeframe you're basing this trade on." />
                    </label>
                    <div className="flex gap-1.5">
                      {timeframes.map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            timeframe === tf
                              ? "bg-primary text-white"
                              : "bg-surface-hover text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Account */}
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5 uppercase tracking-wider">Account</label>
                    <div className="flex gap-1.5">
                      {accountList.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setAccountId(a.id)}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                            accountId === a.id
                              ? "bg-primary text-white"
                              : "bg-surface-hover text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          {a.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Entry */}
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      Entry Price
                      <Tooltip text="The price you plan to enter the trade at." />
                    </label>
                    <input
                      type="number"
                      value={entry}
                      onChange={(e) => setEntry(e.target.value)}
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Stop */}
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      Stop Loss
                      <Tooltip text="The price where you'll exit to limit losses." />
                    </label>
                    <input
                      type="number"
                      value={stop}
                      onChange={(e) => setStop(e.target.value)}
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Target */}
                  <div>
                    <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      Target Price
                      <Tooltip text="Your profit target. Used to calculate risk/reward ratio." />
                    </label>
                    <input
                      type="number"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0.00"
                    />
                  </div>

                  {/* R:R + Position Size */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                        R:R Ratio
                        <Tooltip text="Risk-to-reward ratio. 2:1 means $2 profit potential for every $1 risked." />
                      </label>
                      <div className="text-2xl font-bold font-mono text-text-primary">
                        {rr > 0 ? `${rr.toFixed(1)}:1` : "--"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        Risk: <span className="font-mono text-text-primary">${riskAmt.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        Shares: <span className="font-mono text-text-primary">{shares.toLocaleString()}</span>
                      </span>
                      <span>
                        Cost: <span className="font-mono text-text-primary">${cost.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {isIraShort && (
                  <div className="mt-4 p-3 rounded-lg bg-signal-red/10 border border-signal-red/30 text-signal-red text-sm font-medium">
                    Not IRA-eligible: short selling not permitted in IRA
                  </div>
                )}
              </Card>
            </div>

            {/* S/R Levels Panel */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-text-primary">
                    S/R Levels &mdash; {ticker}
                  </h2>
                  <Link
                    href={`/assets/${assetId}`}
                    className="text-xs text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    Edit Levels &rarr;
                  </Link>
                </div>

                {entryNum > 0 && (
                  <div className="mb-3 px-3 py-1.5 rounded-lg bg-surface-hover text-xs text-text-muted">
                    Entry: <span className="font-mono text-text-primary">${entryNum.toLocaleString()}</span>
                  </div>
                )}

                {activeLevels.length === 0 ? (
                  <p className="text-sm text-text-muted">No levels defined. Add them on the Asset Detail page.</p>
                ) : (
                  <div className="space-y-1">
                    {[...activeLevels]
                      .sort((a, b) => b.price - a.price)
                      .map((l) => {
                        const isAbove = entryNum > 0 && l.price > entryNum;
                        const isBelow = entryNum > 0 && l.price < entryNum;
                        const distPct = entryNum > 0 ? ((l.price - entryNum) / entryNum) * 100 : 0;

                        const sortedAbove = activeLevels.filter((lv) => lv.price > entryNum).sort((a, b) => a.price - b.price);
                        const sortedBelow = activeLevels.filter((lv) => lv.price < entryNum).sort((a, b) => b.price - a.price);
                        const isNearestResistance = sortedAbove.length > 0 && sortedAbove[0].price === l.price;
                        const isNearestSupport = sortedBelow.length > 0 && sortedBelow[0].price === l.price;
                        const isNearest = entryNum > 0 && (isNearestResistance || isNearestSupport);

                        return (
                          <div
                            key={l.id}
                            className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                              isNearest
                                ? isAbove
                                  ? "bg-signal-red/10 border border-signal-red/30"
                                  : "bg-signal-green/10 border border-signal-green/30"
                                : "hover:bg-surface-hover/50 border border-transparent"
                            }`}
                          >
                            <div
                              className={`w-1 h-8 rounded-full flex-shrink-0 ${
                                isAbove ? "bg-signal-red" : isBelow ? "bg-signal-green" : "bg-text-muted"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-mono text-sm font-medium ${
                                    isAbove ? "text-signal-red" : isBelow ? "text-signal-green" : "text-text-primary"
                                  }`}
                                >
                                  ${l.price.toLocaleString()}
                                </span>
                                {entryNum > 0 && (
                                  <span
                                    className={`text-xs font-mono ${
                                      isAbove ? "text-signal-red/70" : isBelow ? "text-signal-green/70" : "text-text-muted"
                                    }`}
                                  >
                                    {distPct > 0 ? "+" : ""}
                                    {distPct.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-xs text-text-muted">{l.label}</span>
                                <div className="flex items-center gap-1.5">
                                  {isNearest && (
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider ${
                                        isNearestResistance ? "text-signal-red" : "text-signal-green"
                                      }`}
                                    >
                                      {isNearestResistance ? "Nearest R" : "Nearest S"}
                                    </span>
                                  )}
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      l.levelType === "manual"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-signal-yellow/10 text-signal-yellow"
                                    }`}
                                  >
                                    {l.levelType === "manual" ? "Manual" : l.levelType === "pivot" ? "Pivot" : "Fibonacci"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                <p className="mt-4 text-[11px] text-text-muted leading-relaxed">
                  Levels are defined per asset on the Assets page.
                </p>
              </Card>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors"
          >
            Continue to Checklist Scoring &rarr;
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <button
            onClick={() => setStep(1)}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            &larr; Back to Setup
          </button>

          <TradingViewChart symbol={ticker} interval={timeframe} height={450} />

          {/* Live Indicator Readout */}
          {indicators && (
            <Card>
              <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
                Live Indicators
                <Tooltip text="Locally computed from live price data. Used to auto-suggest checklist values below." />
                {indicatorsLoading && (
                  <span className="w-3 h-3 border border-text-muted border-t-primary rounded-full animate-spin" />
                )}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {indicators.rsi !== null && (
                  <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-text-muted uppercase tracking-wider">RSI (14)</div>
                    <div className={`text-lg font-bold font-mono ${
                      indicators.rsi >= 70 ? "text-signal-red" : indicators.rsi <= 30 ? "text-signal-green" : "text-text-primary"
                    }`}>
                      {indicators.rsi.toFixed(1)}
                    </div>
                  </div>
                )}
                {indicators.bb !== null && (
                  <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-text-muted uppercase tracking-wider">Bollinger Bands</div>
                    <div className="text-xs font-mono text-text-secondary space-y-0.5 mt-1">
                      <div>Upper: <span className="text-signal-red">${indicators.bb.upper.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div>Mid: <span className="text-text-primary">${indicators.bb.middle.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div>Lower: <span className="text-signal-green">${indicators.bb.lower.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                    </div>
                  </div>
                )}
                {(indicators.ema20 !== null || indicators.ema50 !== null) && (
                  <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-text-muted uppercase tracking-wider">EMAs</div>
                    <div className="text-xs font-mono text-text-secondary space-y-0.5 mt-1">
                      {indicators.ema20 !== null && (
                        <div>EMA(20): <span className="text-text-primary">${indicators.ema20.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      )}
                      {indicators.ema50 !== null && (
                        <div>EMA(50): <span className="text-text-primary">${indicators.ema50.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      )}
                    </div>
                  </div>
                )}
                {indicators.kc !== null && (
                  <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-text-muted uppercase tracking-wider">Keltner Channels</div>
                    <div className="text-xs font-mono text-text-secondary space-y-0.5 mt-1">
                      <div>Upper: <span className="text-signal-red">${indicators.kc.upper.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div>Mid: <span className="text-text-primary">${indicators.kc.middle.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                      <div>Lower: <span className="text-signal-green">${indicators.kc.lower.toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                    </div>
                  </div>
                )}
                {indicators.lastVolume !== null && indicators.volumeAvg20 !== null && indicators.volumeAvg20 > 0 && (
                  <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                    <div className="text-xs text-text-muted uppercase tracking-wider">Volume Ratio</div>
                    <div className={`text-lg font-bold font-mono ${
                      indicators.lastVolume / indicators.volumeAvg20 >= 1.2 ? "text-signal-green" : "text-text-primary"
                    }`}>
                      {(indicators.lastVolume / indicators.volumeAvg20).toFixed(2)}x
                    </div>
                  </div>
                )}
                <div className="bg-surface-hover/50 rounded-lg px-3 py-2">
                  <div className="text-xs text-text-muted uppercase tracking-wider">Squeeze</div>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      indicators.squeeze
                        ? "bg-signal-yellow/20 text-signal-yellow"
                        : "bg-surface-hover text-text-muted"
                    }`}>
                      {indicators.squeeze ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
              {Object.keys(suggestions).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className="text-xs text-text-muted">Auto-applied:</span>
                  {Object.entries(suggestions).map(([key, suggestion]) => {
                    const labels: Record<string, string> = {
                      trend: "Trend",
                      rsi: "RSI",
                      meanReversion: "Mean Reversion",
                      srProximity: "S/R Proximity",
                      riskReward: "R:R",
                      volume: "Volume",
                      multiTf: "Multi-TF",
                      ira: "IRA",
                    };
                    const s = suggestion as { value: string; reason: string };
                    return (
                      <span key={key} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                        {labels[key] ?? key} → {s.value} <span className="text-primary/60">({s.reason})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-1">Checklist Scoring</h2>
            <p className="text-sm text-text-muted mb-5">
              {ticker} {direction.toUpperCase()} {timeframe} &mdash; Entry{" "}
              <span className="font-mono">${entryNum.toLocaleString()}</span>
            </p>

            <div className="space-y-5">
              {factors.map((f, idx) => {
                const fKey = String(f.id);
                const val = factorValues[fKey] ?? null;
                const suggested = autoSuggested[fKey];
                const isOverridden = suggested && val && val !== suggested;

                // Compute inline preview score for this factor
                let earned = 0;
                if (val) {
                  if (f.scoreType === "pass_fail") {
                    earned = val === "true" ? f.weight : 0;
                  } else if (f.scoreType === "scale") {
                    const options = f.configJson ? (JSON.parse(f.configJson).options as string[]) : [];
                    const i = options.indexOf(val);
                    if (i >= 0 && options.length > 1) earned = (i / (options.length - 1)) * f.weight;
                  } else if (f.scoreType === "numeric") {
                    const num = parseFloat(val);
                    if (num >= 2) earned = f.weight;
                    else if (num >= 1) earned = f.weight * 0.5;
                  }
                }

                return (
                  <div key={f.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-primary font-medium flex items-center gap-1.5">
                        {idx + 1}. {f.name}
                        {f.description && <Tooltip text={f.description} />}
                        {suggested && !isOverridden && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-normal">
                            Auto
                          </span>
                        )}
                        {isOverridden && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-signal-yellow/15 text-signal-yellow font-normal">
                            Override (was: {suggested})
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        {Math.round(earned)}/{f.weight}
                      </span>
                    </div>

                    {f.scoreType === "pass_fail" && (
                      <Toggle value={val} onChange={(v) => setFactorValues((prev) => ({ ...prev, [String(f.id)]: v }))} />
                    )}

                    {f.scoreType === "scale" && (() => {
                      const options = f.configJson ? (JSON.parse(f.configJson).options as string[]) : [];
                      return (
                        <RadioPills
                          options={options.map((o) => ({ value: o, label: o }))}
                          value={val}
                          onChange={(v) => setFactorValues((prev) => ({ ...prev, [String(f.id)]: v }))}
                        />
                      );
                    })()}

                    {f.scoreType === "numeric" && (
                      <div className="text-sm text-text-secondary">
                        Auto-calculated: <span className="font-mono text-text-primary">{rr.toFixed(1)}:1</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Score Bar */}
          <Card className="!p-4">
            <div className="flex items-center gap-4">
              <span className={`text-3xl font-bold font-mono ${scoreColor}`}>{previewScore}</span>
              <div className="flex-1">
                <div className="h-3 bg-surface-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${previewScore}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-text-muted flex items-center gap-1">
                /100
                <Tooltip text="Weighted sum of all factors. Green (75+) = high conviction, Yellow (50-74) = moderate, Red (<50) = low." />
              </span>
            </div>
          </Card>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "View Recommendation \u2192"}
          </button>
        </>
      )}
    </div>
  );
}
