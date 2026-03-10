export default function FactorBar({
  label,
  score,
  max,
  passed,
}: {
  label: string;
  score: number;
  max: number;
  passed: boolean;
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-5 text-center">
        {passed ? (
          <span className="text-signal-green">&#10003;</span>
        ) : (
          <span className="text-signal-red">&#10007;</span>
        )}
      </span>
      <span className="text-sm text-text-secondary w-44 truncate">{label}</span>
      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${passed ? "bg-signal-green" : "bg-signal-red"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-text-muted w-12 text-right">
        {score}/{max}
      </span>
    </div>
  );
}
