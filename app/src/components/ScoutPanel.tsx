"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
}

interface ScoutPanelProps {
  ticker: string | null;
  timeframe?: string;
  direction?: string;
  entryPrice?: number;
  stopLoss?: number;
  target?: number;
}

export default function ScoutPanel({
  ticker,
  timeframe = "Daily",
  direction,
  entryPrice,
  stopLoss,
  target,
}: ScoutPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevTickerRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Reset messages when ticker changes
  useEffect(() => {
    if (ticker && ticker !== prevTickerRef.current) {
      setMessages([]);
      setUsage(null);
      setError(null);
      prevTickerRef.current = ticker;
    }
  }, [ticker]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || streaming || !ticker) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          ticker,
          timeframe,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Error: ${res.status}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              assistantText += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
            if (data.usage) setUsage(data.usage);
            if (data.error) setError(data.error);
          } catch {
            // partial chunk
          }
        }
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setStreaming(false);
    }
  };

  const handleAnalyze = () => {
    if (!ticker) return;
    const parts = [`Give me a pre-trade analysis for ${ticker}`];
    if (direction) parts.push(`Direction: ${direction}`);
    if (entryPrice) parts.push(`Entry: $${entryPrice}`);
    if (stopLoss) parts.push(`Stop: $${stopLoss}`);
    if (target) parts.push(`Target: $${target}`);
    sendMessage(parts.join(". "));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) sendMessage(input);
    }
  };

  if (!ticker) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-text-muted text-sm text-center">
          Select an asset to use Scout
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.158 3.475a2.25 2.25 0 01-2.132 1.525H8.29a2.25 2.25 0 01-2.132-1.525L5 14.5m14 0H5" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">Scout</span>
          <span className="text-xs font-mono text-text-muted">{ticker}</span>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-text-muted hover:text-text-primary transition-colors text-xs"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>

      {collapsed ? null : (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-text-muted text-xs text-center">
                  AI-powered trade analysis
                </p>
                <button
                  onClick={handleAnalyze}
                  disabled={streaming}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Analyze {ticker}
                </button>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[90%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap bg-primary text-white">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg px-3 py-2 text-xs bg-surface-hover/50 border border-border/50 text-text-primary prose prose-invert prose-xs max-w-none prose-headings:text-text-primary prose-headings:font-semibold prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-1.5 prose-h3:text-xs prose-h3:mt-2.5 prose-h3:mb-1 prose-p:text-text-secondary prose-p:my-1 prose-p:text-xs prose-li:text-text-secondary prose-li:text-xs prose-li:my-0 prose-strong:text-text-primary prose-ul:my-1 prose-ol:my-1 prose-hr:border-border prose-hr:my-2">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3 bg-text-muted ml-0.5 animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-signal-red/10 border border-signal-red/30 rounded-lg px-3 py-2 text-xs text-signal-red">
                {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border space-y-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this trade..."
                disabled={streaming}
                className="flex-1 bg-surface-hover border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                onClick={() => input.trim() && sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Send
              </button>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleAnalyze}
                disabled={streaming}
                className="w-full py-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
              >
                Re-analyze with current setup
              </button>
            )}
            {usage && (
              <p className="text-[10px] text-text-muted text-right">
                {usage.input_tokens.toLocaleString()} + {usage.output_tokens.toLocaleString()} tokens
                (~${((usage.input_tokens * 0.003 + usage.output_tokens * 0.015) / 1000).toFixed(4)})
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
