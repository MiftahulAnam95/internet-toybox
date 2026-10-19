import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { blip } from "@/lib/uiSound";

export function ControlGroup({ label, children, value, className }: { label: string; children: ReactNode; value?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink/60">
        <span>{label}</span>
        {value !== undefined && <span className="text-ink tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

export function Slider({
  label, value, min, max, step = 1, onChange, format,
}: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <ControlGroup label={label} value={format ? format(value) : value}>
      <input
        type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </ControlGroup>
  );
}

export function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ControlGroup label={label}>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap border-2 border-ink">
        {options.map((o, i) => (
          <button
            key={o.value} type="button" role="radio" aria-checked={value === o.value}
            onClick={() => { blip(520 + i * 80); onChange(o.value); }}
            className={cn(
              "min-h-9 flex-1 px-2 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors",
              i > 0 && "border-l-2 border-ink",
              value === o.value ? "bg-ink text-lime" : "bg-paper hover:bg-lime/60",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </ControlGroup>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={() => { blip(checked ? 400 : 700); onChange(!checked); }}
      className="flex min-h-9 items-center justify-between gap-3 border-2 border-ink bg-paper px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-wide hover:bg-paper-2"
    >
      <span>{label}</span>
      <span className={cn("relative inline-block h-4 w-8 border-2 border-ink transition-colors", checked ? "bg-lime" : "bg-paper-2")}>
        <span className={cn("absolute top-0 h-3 w-3 bg-ink transition-all", checked ? "left-[14px]" : "left-0")} />
      </span>
    </button>
  );
}

export function Swatches({
  label, colors, value, onChange,
}: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <ControlGroup label={label}>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {colors.map((c) => (
          <button
            key={c} type="button" role="radio" aria-checked={value === c} aria-label={c}
            onClick={() => { blip(800); onChange(c); }}
            className={cn("h-8 w-8 border-2 border-ink transition-transform", value === c ? "scale-110 shadow-[2px_2px_0_#191919]" : "hover:-translate-y-0.5")}
            style={{ background: c }}
          />
        ))}
      </div>
    </ControlGroup>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "ink" | "paper" | "lime" | "signal" | "ghost"; icon?: ReactNode };

export function Btn({ variant = "paper", icon, className, children, onClick, ...rest }: BtnProps) {
  const styles = {
    ink: "bg-ink text-paper border-ink",
    paper: "bg-paper text-ink border-ink",
    lime: "bg-lime text-ink border-ink",
    signal: "bg-signal text-ink border-ink",
    ghost: "bg-transparent text-ink border-transparent hover:border-ink",
  }[variant];
  return (
    <button
      type="button"
      onClick={(e) => { blip(600); onClick?.(e); }}
      className={cn(
        "press inline-flex min-h-9 items-center justify-center gap-2 border-2 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide disabled:pointer-events-none disabled:opacity-40",
        variant !== "ghost" && "hard-shadow-sm",
        styles, className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
