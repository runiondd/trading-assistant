"use client";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-surface border-b border-border flex items-center justify-between px-6 z-20">
      <div className="text-sm text-text-secondary">Dashboard</div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-xs text-text-muted">Total Balance</div>
          <div className="text-sm font-semibold font-mono text-text-primary">$342,000</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
          DR
        </div>
      </div>
    </header>
  );
}
