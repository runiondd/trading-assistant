import { ReactNode } from "react";

export default function Tooltip({
  text,
  children,
  position = "top",
}: {
  text: string;
  children?: ReactNode;
  position?: "top" | "bottom";
}) {
  return (
    <span className="relative inline-flex items-center group">
      {children ?? (
        <span className="w-3.5 h-3.5 rounded-full border border-text-muted/50 inline-flex items-center justify-center text-[10px] leading-none text-text-muted cursor-help select-none flex-shrink-0">
          ?
        </span>
      )}
      <span
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 w-max max-w-xs rounded-lg border border-border bg-slate-900/95 px-3 py-2.5 text-sm text-text-secondary shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
          position === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
