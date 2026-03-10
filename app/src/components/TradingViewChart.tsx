"use client";

import { useMemo } from "react";

const ASSET_SYMBOL_MAP: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  SOL: "BINANCE:SOLUSDT",
  AAPL: "NASDAQ:AAPL",
  GLD: "AMEX:GLD",
  SLV: "AMEX:SLV",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
};

const TIMEFRAME_INTERVAL_MAP: Record<string, string> = {
  Weekly: "W",
  Daily: "D",
  "4h": "240",
  "1h": "60",
};

interface TradingViewChartProps {
  symbol: string;
  interval: string;
  height?: number;
}

export default function TradingViewChart({
  symbol,
  interval,
  height = 500,
}: TradingViewChartProps) {
  const tvSymbol = ASSET_SYMBOL_MAP[symbol] ?? `NASDAQ:${symbol}`;
  const tvInterval = TIMEFRAME_INTERVAL_MAP[interval] ?? "D";

  const src = useMemo(() => {
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: tvInterval,
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(15, 23, 42, 1)",
      gridColor: "rgba(30, 41, 59, 1)",
      withdateranges: true,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      studies: [
        "RSI@tv-basicstudies",
        "BB@tv-basicstudies",
        "KC@tv-basicstudies",
        "VWAP@tv-basicstudies",
      ],
      support_host: "https://www.tradingview.com",
    };
    return `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en#${encodeURIComponent(JSON.stringify(config))}`;
  }, [tvSymbol, tvInterval]);

  if (!symbol) {
    return (
      <div
        className="w-full rounded-xl border border-border bg-[#0F172A] flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-text-muted text-sm">Select an asset to view chart</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden border border-border bg-[#0F172A]"
      style={{ height }}
    >
      <iframe
        src={src}
        style={{ width: "100%", height: "100%", border: "none" }}
        sandbox="allow-scripts allow-same-origin allow-popups"
        loading="lazy"
      />
    </div>
  );
}
