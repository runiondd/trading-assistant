export type SignalLevel = "green" | "yellow" | "red";

const config: Record<SignalLevel, { bg: string; text: string; dot: string; label: string }> = {
  green: {
    bg: "bg-signal-green/10",
    text: "text-signal-green",
    dot: "bg-signal-green",
    label: "High",
  },
  yellow: {
    bg: "bg-signal-yellow/10",
    text: "text-signal-yellow",
    dot: "bg-signal-yellow",
    label: "Medium",
  },
  red: {
    bg: "bg-signal-red/10",
    text: "text-signal-red",
    dot: "bg-signal-red",
    label: "Low",
  },
};

export function SignalDot({ level }: { level: SignalLevel }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${config[level].dot}`} />;
}

export default function SignalBadge({ level }: { level: SignalLevel }) {
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
