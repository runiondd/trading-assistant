"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface ExplainProps {
  /** The data point or insight to explain, e.g. "RSI(14) at 42.1" */
  context: string;
  /** Current ticker for market context */
  ticker?: string;
  /** Optional extra context like direction, timeframe */
  tradeContext?: string;
}

export default function Explain({ context, ticker, tradeContext }: ExplainProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fetchExplanation = async () => {
    if (explanation) {
      setOpen(!open);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);

    const prompt = [
      `Explain this to me in plain English — what does it mean and how should I interpret it for my trade?`,
      ``,
      `Data point: ${context}`,
      ticker ? `Ticker: ${ticker}` : "",
      tradeContext ? `Trade context: ${tradeContext}` : "",
      ``,
      `Keep it to 2-3 short paragraphs. First explain what the metric is, then what this specific value means, then how it should factor into my decision. Use concrete language, not jargon.`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          ticker: ticker || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not get explanation");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response");
        setLoading(false);
        return;
      }

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              text += data.text;
              setExplanation(text);
            }
            if (data.error) setError(data.error);
          } catch {
            // partial chunk
          }
        }
      }
    } catch {
      setError("Failed to fetch explanation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={fetchExplanation}
        className="w-4 h-4 rounded-full bg-surface-hover hover:bg-primary/20 text-text-muted hover:text-primary text-[10px] font-bold flex items-center justify-center transition-colors flex-shrink-0"
        title="What does this mean?"
      >
        ?
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                Scout Explains
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                &times;
              </button>
            </div>

            {loading && !explanation && (
              <div className="flex items-center gap-2 py-3">
                <div className="w-3 h-3 border border-text-muted border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-text-muted">Thinking...</span>
              </div>
            )}

            {error && (
              <p className="text-xs text-signal-red">{error}</p>
            )}

            {explanation && (
              <div className="text-xs prose prose-invert prose-xs max-w-none prose-p:text-text-secondary prose-p:my-1.5 prose-p:text-xs prose-strong:text-text-primary prose-li:text-text-secondary prose-li:text-xs">
                <ReactMarkdown>{explanation}</ReactMarkdown>
                {loading && (
                  <span className="inline-block w-1.5 h-3 bg-text-muted ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
