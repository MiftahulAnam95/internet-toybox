import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { blip } from "@/lib/uiSound";
import { Btn } from "@/components/controls/Controls";
import { cn } from "@/utils/cn";
import { PanelSection, ToyLayout, type ToyProps } from "./ToyLayout";

type Log = (msg: string) => void;

function Specimen({ n, name, note, children, className, tone = "#F5F3EC" }: { n: number; name: string; note: string; children: ReactNode; className?: string; tone?: string }) {
  const { t } = useI18n();
  return (
    <section className={cn("relative flex min-h-[210px] flex-col border-b-2 border-ink p-4 sm:border-r-2", className)} style={{ background: tone }}>
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-extrabold leading-none">{name}</h3>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">{t.toys["button-lab"].specimen} #{String(n).padStart(2, "0")}</span>
      </header>
      <p className="mt-1 font-mono text-[10.5px] text-ink/60">{note}</p>
      <div className="relative mt-3 flex flex-1 items-center justify-center">{children}</div>
    </section>
  );
}

const labBtn = "press hard-shadow-sm border-2 border-ink px-4 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wide select-none";

/* 01 — runs away */
function Runaway({ log }: { log: Log }) {
  const tt = useI18n().t.toys["button-lab"].runaway;
  const area = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [escapes, setEscapes] = useState(0);
  const [caught, setCaught] = useState(false);
  const tired = escapes >= 7;
  const fledAt = useRef(0);
  const flee = (cx: number, cy: number) => {
    if (caught || tired || !area.current) return;
    fledAt.current = performance.now();
    const r = area.current.getBoundingClientRect();
    const bx = r.left + (pos.x / 100) * r.width, by = r.top + (pos.y / 100) * r.height;
    if (Math.hypot(cx - bx, cy - by) < 70) {
      let nx = 15 + Math.random() * 70, ny = 20 + Math.random() * 60;
      if (Math.abs(nx - pos.x) < 25) nx = (nx + 45) % 85 + 10;
      setPos({ x: nx, y: ny });
      setEscapes((e) => e + 1);
      blip(900, 0.04, "sine");
    }
  };
  return (
    <div ref={area} className="absolute inset-0" onPointerMove={(e) => flee(e.clientX, e.clientY)}>
      <button
        type="button"
        onPointerDown={(e) => { if (e.pointerType !== "mouse" && !tired) { e.preventDefault(); flee(e.clientX, e.clientY); } }}
        onClick={() => { if (!tired && performance.now() - fledAt.current < 350) return; if (!caught) { setCaught(true); log(tt.caught); blip(1200, 0.2, "triangle"); } }}
        className={cn(labBtn, "absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-200 ease-out", caught ? "bg-lime" : tired ? "bg-lav" : "bg-paper")}
        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      >
        {caught ? "🏆 " + tt.caught : tired ? "😮‍💨 " + tt.btn : tt.btn}
      </button>
    </div>
  );
}

/* 02 — duplicates */
function Clone({ log, initial }: { log: Log; initial: number }) {
  const tt = useI18n().t.toys["button-lab"].clone;
  const MAX = 12;
  const [copies, setCopies] = useState(() => Array.from({ length: initial }, () => Math.random() * 16 - 8));
  const add = () => {
    if (copies.length >= MAX) { log(tt.limit); blip(150, 0.15, "sawtooth"); return; }
    setCopies((c) => [...c, Math.random() * 16 - 8]);
    blip(500 + copies.length * 60, 0.05);
  };
  const colors = ["bg-paper", "bg-lime", "bg-lav", "bg-signal", "bg-cobalt text-paper"];
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex max-h-[130px] flex-wrap justify-center gap-1.5 overflow-hidden">
        <button type="button" onClick={add} className={cn(labBtn, "bg-paper")}>{tt.btn}</button>
        {copies.map((rot, i) => (
          <button key={i} type="button" onClick={add} style={{ transform: `rotate(${rot}deg)` }}
            className={cn("pop-in border-2 border-ink px-2 py-1 font-mono text-[10px] uppercase", colors[i % colors.length])}>
            {tt.btn}
          </button>
        ))}
      </div>
      <span className={cn("font-mono text-[10px] uppercase", copies.length >= MAX && "text-signal")}>{tt.note(copies.length, MAX)}</span>
    </div>
  );
}

/* 03 — changes label */
function LabelSwap({ initial }: { initial: number }) {
  const tt = useI18n().t.toys["button-lab"].label;
  const [i, setI] = useState(initial);
  const rot = [0, -3, 2, -1, 4, -2, 1, -4, 3, 0][i % 10];
  return (
    <button type="button" onClick={() => { setI((v) => (v + 1) % tt.labels.length); blip(400 + i * 50); }}
      className={cn(labBtn, "bg-paper transition-transform")} style={{ transform: `rotate(${rot}deg)`, minWidth: 160 }}>
      {tt.labels[i % tt.labels.length]}
    </button>
  );
}

/* 04 — confetti burst */
function Burst({ log }: { log: Log }) {
  const tt = useI18n().t.toys["button-lab"].burst;
  const [bits, setBits] = useState<{ id: number; dx: number; dy: number; c: string; s: string; r: number }[]>([]);
  const id = useRef(0);
  const fire = () => {
    const colors = ["#D8FF3E", "#3457FF", "#FF6238", "#C8B8FF", "#191919"];
    const shapes = ["50%", "0", "0 50% 50% 50%"];
    const nb = Array.from({ length: 22 }, () => {
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      return { id: id.current++, dx: Math.cos(a) * d, dy: Math.sin(a) * d - 30, c: colors[Math.floor(Math.random() * 5)], s: shapes[Math.floor(Math.random() * 3)], r: Math.random() * 720 - 360 };
    });
    setBits((b) => [...b.slice(-60), ...nb]);
    const ids = new Set(nb.map((b) => b.id));
    window.setTimeout(() => setBits((b) => b.filter((x) => !ids.has(x.id))), 900);
    blip(700, 0.08, "triangle"); blip(1050, 0.1, "triangle");
    log("🎉");
  };
  return (
    <div className="relative">
      <button type="button" onClick={fire} className={cn(labBtn, "bg-lime")}>{tt.btn}</button>
      <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden>
        {bits.map((b) => (
          <span key={b.id} className="absolute block h-2.5 w-2.5 border border-ink"
            style={{ background: b.c, borderRadius: b.s, animation: "none", transform: "translate(-50%,-50%)", ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--r" as string]: `${b.r}deg` }}
            ref={(el) => {
              if (el && !el.dataset.anim) {
                el.dataset.anim = "1";
                el.animate(
                  [{ transform: "translate(-50%,-50%) rotate(0)", opacity: 1 }, { transform: `translate(calc(-50% + ${b.dx}px), calc(-50% + ${b.dy + 60}px)) rotate(${b.r}deg)`, opacity: 0 }],
                  { duration: 850, easing: "cubic-bezier(.15,.7,.3,1)", fill: "forwards" },
                );
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* 05 — fake loading */
function Loading({ log }: { log: Log }) {
  const tt = useI18n().t.toys["button-lab"].loading;
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  const start = () => {
    if (state === "loading") return;
    setState("loading"); setProgress(0);
    let p = 0;
    timer.current = window.setInterval(() => {
      p += Math.random() * (p > 80 ? 3 : 12);
      if (p >= 99 && Math.random() < 0.7) p = 99; // the classic 99% stall
      if (p >= 100 || (p >= 99 && Math.random() < 0.2)) {
        window.clearInterval(timer.current);
        const m = tt.messages[Math.floor(Math.random() * tt.messages.length)];
        setMsg(m); setState("done"); setProgress(100); log(m); blip(880, 0.15, "sine");
        return;
      }
      setProgress(Math.min(99, p));
    }, 180);
  };
  return (
    <div className="flex w-full max-w-[260px] flex-col items-stretch gap-2">
      <button type="button" onClick={start} disabled={state === "loading"} className={cn(labBtn, "bg-paper disabled:opacity-100")}>
        {state === "loading" ? `${tt.working}${".".repeat(1 + (Math.floor(progress) % 3))}` : tt.btn}
      </button>
      <div className="h-3 border-2 border-ink bg-paper" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-cobalt transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
      <p className="min-h-[2.5em] font-mono text-[11px] leading-snug">{state === "done" ? "→ " + msg : state === "loading" ? `${Math.floor(progress)}%` : ""}</p>
    </div>
  );
}

/* 06 — page typography takeover */
function FontSwap({ log }: { log: Log }) {
  const tt = useI18n().t.toys["button-lab"].font;
  const [left, setLeft] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const stop = useCallback(() => { window.clearInterval(timer.current); document.body.classList.remove("font-chaos"); setLeft(0); }, []);
  useEffect(() => stop, [stop]);
  const start = () => {
    if (left > 0) { stop(); return; }
    document.body.classList.add("font-chaos");
    log("✒️ " + tt.btn);
    setLeft(8);
    let s = 8;
    timer.current = window.setInterval(() => {
      s -= 1; setLeft(s);
      if (s <= 0) stop();
    }, 1000);
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={start} className={cn(labBtn, left > 0 ? "bg-ink text-lime" : "bg-lav")}>
        {left > 0 ? `${tt.revert} (${left})` : tt.btn}
      </button>
      <span className="font-serif text-2xl italic">Aa → <span className="font-display not-italic font-extrabold">Aa</span></span>
    </div>
  );
}

/* 07 — fast vs slow */
function Tempo() {
  const tt = useI18n().t.toys["button-lab"].tempo;
  const times = useRef<number[]>([]);
  const [mood, setMood] = useState<"idle" | "slow" | "mid" | "fast">("idle");
  const [rate, setRate] = useState(0);
  const idle = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(idle.current), []);
  const tap = () => {
    const now = performance.now();
    times.current = [...times.current.slice(-4), now];
    const ts = times.current;
    if (ts.length >= 2) {
      const avg = (ts[ts.length - 1] - ts[0]) / (ts.length - 1);
      setRate(Math.round(60000 / avg));
      setMood(avg < 230 ? "fast" : avg > 650 ? "slow" : "mid");
      blip(avg < 230 ? 1200 : avg > 650 ? 300 : 600, 0.05);
    }
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => { setMood("idle"); times.current = []; setRate(0); }, 2000);
  };
  const style = {
    idle: "bg-paper",
    slow: "bg-lav scale-95",
    mid: "bg-lime",
    fast: "bg-signal scale-110 wobble",
  }[mood];
  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={tap} className={cn(labBtn, "transition-transform", style)}>{tt.btn}</button>
      <p className="font-mono text-[11px]">{mood === "fast" ? tt.fast : mood === "slow" ? tt.slow : mood === "mid" ? `${rate} taps/min` : tt.idle}</p>
    </div>
  );
}

export default function ButtonLabToy({ surprise }: ToyProps) {
  const { t } = useI18n();
  const tt = t.toys["button-lab"];
  const [resetKey, setResetKey] = useState(0);
  const [logs, setLogs] = useState<{ id: number; msg: string; at: string }[]>([]);
  const id = useRef(0);
  const log = useCallback<Log>((msg) => {
    const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((l) => [{ id: id.current++, msg, at }, ...l].slice(0, 12));
  }, []);
  const resetAll = () => {
    document.body.classList.remove("font-chaos");
    setResetKey((k) => k + 1);
    setLogs([]);
  };
  return (
    <ToyLayout
      stageClassName="h-auto min-h-0 overflow-visible lg:overflow-y-auto"
      stage={
        <div key={resetKey} className="grid grid-cols-1 border-ink sm:grid-cols-2 xl:grid-cols-3">
          <Specimen n={1} name={tt.runaway.name} note={tt.runaway.note} className="min-h-[240px]"><Runaway log={log} /></Specimen>
          <Specimen n={2} name={tt.clone.name} note="" tone="#ECE9DF"><Clone log={log} initial={surprise && resetKey === 0 ? 4 : 0} /></Specimen>
          <Specimen n={3} name={tt.label.name} note={tt.label.note}><LabelSwap initial={surprise && resetKey === 0 ? 3 : 0} /></Specimen>
          <Specimen n={4} name={tt.burst.name} note={tt.burst.note} tone="#ECE9DF"><Burst log={log} /></Specimen>
          <Specimen n={5} name={tt.loading.name} note={tt.loading.note}><Loading log={log} /></Specimen>
          <Specimen n={6} name={tt.font.name} note={tt.font.note} tone="#ECE9DF"><FontSwap log={log} /></Specimen>
          <Specimen n={7} name={tt.tempo.name} note={tt.tempo.note} className="sm:col-span-2 xl:col-span-3" tone="#D8FF3E"><Tempo /></Specimen>
        </div>
      }
      panel={
        <>
          <Btn variant="ink" icon={<RotateCcw size={14} />} onClick={resetAll}>{tt.resetAll}</Btn>
          <PanelSection title="Lab log">
            <ol className="flex flex-col gap-1 font-mono text-[11px]" aria-live="polite">
              {logs.length === 0 && <li className="text-ink/50">—</li>}
              {logs.map((l) => (
                <li key={l.id} className="pop-in flex gap-2 border-b border-ink/15 pb-1">
                  <span className="text-ink/45 tabular-nums">{l.at}</span>
                  <span>{l.msg}</span>
                </li>
              ))}
            </ol>
          </PanelSection>
        </>
      }
    />
  );
}
