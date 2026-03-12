"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Card from "@/components/Card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
}

export default function CopilotPage() {
  const [ticker, setTicker] = useState("");
  const [activeTicker, setActiveTicker] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const sendMessage = async (userMessage: string, currentTicker: string | null) => {
    if (!userMessage.trim() || streaming) return;

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
          ticker: currentTicker,
          timeframe: "Daily",
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

      // Add empty assistant message to fill in
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6);
          try {
            const data = JSON.parse(json);
            if (data.text) {
              assistantText += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
            if (data.usage) {
              setUsage(data.usage);
            }
            if (data.error) {
              setError(data.error);
            }
          } catch {
            // Ignore parse errors on partial chunks
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
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setActiveTicker(t);
    setMessages([]);
    setUsage(null);
    sendMessage(`Give me a pre-trade analysis for ${t}`, t);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input, activeTicker);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeTicker) handleSend();
      else handleAnalyze();
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <h1 className="text-xl font-bold text-text-primary mb-4">Scout</h1>

      {/* Ticker input + Analyze */}
      <Card className="!p-3 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
            placeholder="Ticker (e.g. TSLA)"
            className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleAnalyze}
            disabled={!ticker.trim() || streaming}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Analyze
          </button>
        </div>
        {activeTicker && (
          <p className="text-xs text-text-muted mt-2">
            Analyzing <span className="font-mono text-text-secondary">{activeTicker}</span>
          </p>
        )}
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {messages.length === 0 && !error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-muted text-sm">
              Enter a ticker and click Analyze to get started.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap bg-primary text-white">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] rounded-xl px-5 py-4 text-sm bg-surface border border-border text-text-primary prose prose-invert prose-sm max-w-none prose-headings:text-text-primary prose-headings:font-semibold prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1 prose-p:text-text-secondary prose-p:my-1.5 prose-li:text-text-secondary prose-li:my-0.5 prose-strong:text-text-primary prose-ul:my-1 prose-ol:my-1 prose-hr:border-border prose-hr:my-3">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {streaming && i === messages.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-text-muted ml-0.5 animate-pulse" />
                )}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="bg-signal-red/10 border border-signal-red/30 rounded-xl px-4 py-3 text-sm text-signal-red">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 pb-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeTicker ? "Ask a follow-up..." : "Enter ticker above first"}
          disabled={!activeTicker || streaming}
          className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !activeTicker || streaming}
          className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {/* Token usage */}
      {usage && (
        <p className="text-xs text-text-muted text-right pb-1">
          Tokens: {usage.input_tokens.toLocaleString()} in / {usage.output_tokens.toLocaleString()} out
          {" "}(~${((usage.input_tokens * 0.003 + usage.output_tokens * 0.015) / 1000).toFixed(4)})
        </p>
      )}
    </div>
  );
}
