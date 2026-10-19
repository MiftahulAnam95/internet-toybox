import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Link2, Play, RotateCcw, Shuffle, Square, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { copyText, fitCanvas } from "@/lib/export";
import { toyUrl } from "@/lib/toys";
import { getCtx } from "@/lib/uiSound";
import { useLatest } from "@/lib/hooks";
import { Btn, Segmented, Slider } from "@/components/controls/Controls";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { PanelSection, ToyLayout, type ToyProps } from "./ToyLayout";

type Pal = "glass" | "chip" | "wood" | "void";
const PALS: Pal[] = ["glass", "chip", "wood", "void"];
const ROWS = 8, STEPS = 16;
// C major pentatonic, top row = highest
const FREQS = [659.25, 587.33, 523.25, 440.0, 392.0, 329.63, 293.66, 261.63];
const ROW_COLORS = ["#FF6238", "#FF6238", "#D8FF3E", "#D8FF3E", "#3457FF", "#3457FF", "#C8B8FF", "#C8B8FF"];
const PAL_ACCENT: Record<Pal, string> = { glass: "#C8B8FF", chip: "#D8FF3E", wood: "#FF6238", void: "#3457FF" };

const empty = () => Array.from({ length: ROWS }, () => new Array<boolean>(STEPS).fill(false));
const DEFAULT: [number, number][] = [[7, 0], [5, 2], [4, 4], [2, 6], [7, 8], [3, 10], [4, 12], [1, 14], [6, 3], [6, 11], [0, 7], [0, 15]];
function defaultPattern() { const p = empty(); DEFAULT.forEach(([r, c]) => (p[r][c] = true)); return p; }
function randomPattern() {
  const p = empty();
  for (let c = 0; c < STEPS; c++) {
    if (Math.random() < 0.7) p[Math.floor(Math.random() * ROWS)][c] = true;
    if (Math.random() < 0.18) p[Math.floor(Math.random() * ROWS)][c] = true;
  }
  return p;
}
function encodePattern(p: boolean[][]) {
  return p.map((row) => parseInt(row.map((v) => (v ? "1" : "0")).join(""), 2).toString(16).padStart(4, "0")).join("");
}
function decodePattern(s: string): boolean[][] | null {
  if (!/^[0-9a-f]{32}$/.test(s)) return null;
  return Array.from({ length: ROWS }, (_, r) => parseInt(s.slice(r * 4, r * 4 + 4), 16).toString(2).padStart(16, "0").split("").map((b) => b === "1"));
}

function voice(c: AudioContext, out: AudioNode, row: number, time: number, pal: Pal) {
  const f = FREQS[row];
  const g = c.createGain();
  g.connect(out);
  const o = c.createOscillator();
  switch (pal) {
    case "glass": {
      o.type = "sine"; o.frequency.value = f * 2;
      const o2 = c.createOscillator(); const g2 = c.createGain();
      o2.type = "sine"; o2.frequency.value = f * 5.02; g2.gain.value = 0.15;
      o2.connect(g2).connect(g);
      o2.start(time); o2.stop(time + 0.7);
      g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.32, time + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);
      break;
    }
    case "chip":
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.11, time); g.gain.setValueAtTime(0.11, time + 0.09); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      break;
    case "wood":
      o.type = "triangle"; o.frequency.setValueAtTime(f * 1.5, time); o.frequency.exponentialRampToValueAtTime(f * 0.75, time + 0.06);
      g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
      break;
    case "void": {
      o.type = "sawtooth"; o.frequency.value = f / 2;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(1400, time); lp.frequency.exponentialRampToValueAtTime(200, time + 0.9); lp.Q.value = 6;
      o.connect(lp).connect(g);
      g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.16, time + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, time + 1.0);
      o.start(time); o.stop(time + 1.05);
      return;
    }
  }
  o.connect(g);
  o.start(time); o.stop(time + 0.75);
}

export default function SoundToy({ surprise, params }: ToyProps) {
  const { t } = useI18n();
  const tt = t.toys["sound-of-nothing"];
  const toast = useToast();

  const shared = (() => {
    const raw = params.get("p");
    if (!raw) return null;
    const [hex, bpm, pal] = raw.split("-");
    const pat = decodePattern(hex ?? "");
    if (!pat) return null;
    return { pat, bpm: Math.max(60, Math.min(200, Number(bpm) || 112)), pal: PALS[Number(pal)] ?? "glass" };
  })();

  const [pattern, setPattern] = useState<boolean[][]>(shared?.pat ?? (surprise ? randomPattern() : defaultPattern()));
  const [bpm, setBpm] = useState(shared?.bpm ?? (surprise ? 90 + Math.floor(Math.random() * 70) : 112));
  const [volume, setVolume] = useState(0.7);
  const [pal, setPal] = useState<Pal>(shared?.pal ?? (surprise ? PALS[Math.floor(Math.random() * 4)] : "glass"));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [step, setStep] = useState(-1);
  const [noAudio, setNoAudio] = useState(false);

  const master = useRef<GainNode | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const raf = useRef(0);
  const queue = useRef<{ step: number; time: number }[]>([]);
  const ripples = useRef<{ x: number; row: number; life: number }[]>([]);
  const vizRef = useRef<HTMLCanvasElement>(null);
  const live = useLatest({ pattern, bpm, pal, volume, muted });

  const emit = useCallback((s: number) => {
    setStep(s);
    live.current.pattern.forEach((row, r) => { if (row[s]) ripples.current.push({ x: s, row: r, life: 1 }); });
  }, [live]);

  // master volume
  useEffect(() => {
    const c = getCtx();
    if (master.current && c) master.current.gain.setTargetAtTime(muted ? 0 : volume * 0.9, c.currentTime, 0.02);
  }, [volume, muted]);

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    cancelAnimationFrame(raf.current);
    queue.current = [];
    setPlaying(false);
    setStep(-1);
  }, []);

  const start = () => {
    const c = getCtx();
    const stepDur = () => 60 / live.current.bpm / 4;
    setPlaying(true);
    if (!c) {
      setNoAudio(true);
      let s = 0;
      const tick = () => { emit(s); s = (s + 1) % STEPS; timer.current = window.setTimeout(tick, stepDur() * 1000); };
      tick();
      return;
    }
    c.resume().catch(() => setNoAudio(true));
    if (!master.current) {
      master.current = c.createGain();
      const comp = c.createDynamicsCompressor();
      master.current.connect(comp).connect(c.destination);
    }
    master.current.gain.value = live.current.muted ? 0 : live.current.volume * 0.9;
    let next = c.currentTime + 0.06;
    let s = 0;
    const schedule = () => {
      while (next < c.currentTime + 0.12) {
        const L = live.current;
        L.pattern.forEach((row, r) => { if (row[s]) voice(c, master.current!, r, next, L.pal); });
        queue.current.push({ step: s, time: next });
        next += stepDur();
        s = (s + 1) % STEPS;
      }
    };
    schedule();
    timer.current = window.setInterval(schedule, 25);
    const vis = () => {
      while (queue.current.length && queue.current[0].time <= c.currentTime) emit(queue.current.shift()!.step);
      raf.current = requestAnimationFrame(vis);
    };
    raf.current = requestAnimationFrame(vis);
  };

  // cleanup on unmount
  useEffect(() => () => {
    window.clearInterval(timer.current); window.clearTimeout(timer.current); cancelAnimationFrame(raf.current);
    master.current?.disconnect();
  }, []);

  // visual score canvas (works without audio)
  useEffect(() => {
    const cv = vizRef.current!;
    const ctx = cv.getContext("2d")!;
    let id = 0;
    const draw = () => {
      const { w, h, dpr } = fitCanvas(cv);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#191919"; ctx.fillRect(0, 0, w, h);
      const rs = ripples.current;
      for (let i = rs.length - 1; i >= 0; i--) {
        const r = rs[i];
        r.life -= 0.018;
        if (r.life <= 0) { rs.splice(i, 1); continue; }
        const cx = ((r.x + 0.5) / STEPS) * w, cy = ((r.row + 0.5) / ROWS) * h;
        ctx.strokeStyle = ROW_COLORS[r.row];
        ctx.globalAlpha = r.life;
        ctx.lineWidth = 2;
        const rad = (1 - r.life) * 60 + 4;
        if (live.current.pal === "chip") ctx.strokeRect(cx - rad, cy - rad, rad * 2, rad * 2);
        else { ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      id = requestAnimationFrame(draw);
    };
    id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [live]);

  const toggle = (r: number, c: number) => {
    setPattern((p) => p.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? !v : v)) : row)));
    // audition the note (user gesture → safe to start audio)
    const ctx = getCtx();
    if (ctx && !pattern[r][c] && !muted) {
      ctx.resume().then(() => {
        if (!master.current) { master.current = ctx.createGain(); master.current.connect(ctx.destination); }
        master.current.gain.value = volume * 0.9;
        voice(ctx, master.current, r, ctx.currentTime + 0.01, pal);
      }).catch(() => {});
    }
    ripples.current.push({ x: c, row: r, life: 1 });
  };

  const share = async () => {
    const url = toyUrl("sound-of-nothing", { p: `${encodePattern(pattern)}-${bpm}-${PALS.indexOf(pal)}` });
    window.history.replaceState(null, "", url);
    toast((await copyText(url)) ? t.common.copied : t.common.copyFail);
  };

  const reset = () => { stop(); setPattern(defaultPattern()); setBpm(112); setVolume(0.7); setPal("glass"); setMuted(false); };

  return (
    <ToyLayout
      stageClassName="bg-ink"
      stage={
        <div className="flex h-full flex-col">
          <div className="relative min-h-0 flex-1">
            <canvas ref={vizRef} aria-hidden className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 grid gap-[3px] p-3 sm:gap-1 sm:p-5" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0,1fr))`, gridTemplateRows: `repeat(${ROWS}, minmax(0,1fr))` }}
              role="grid" aria-label={tt.title}>
              {pattern.map((row, r) => row.map((on, c) => (
                <button
                  key={`${r}-${c}`} type="button" aria-pressed={on}
                  aria-label={`row ${r + 1}, step ${c + 1}`}
                  onClick={() => toggle(r, c)}
                  className={cn(
                    "relative min-h-0 border transition-transform duration-75",
                    c % 4 === 0 ? "border-paper/40" : "border-paper/15",
                    on ? "border-ink" : "bg-paper/[0.03] hover:bg-paper/15",
                    step === c && "scale-[1.06]",
                    step === c && !on && "bg-paper/20",
                  )}
                  style={on ? { background: ROW_COLORS[r], boxShadow: step === c ? `0 0 0 2px #F5F3EC` : undefined } : undefined}
                />
              )))}
            </div>
          </div>
          <div className="flex items-center gap-3 border-t-2 border-paper/20 px-4 py-2 font-mono text-[10.5px] uppercase tracking-wider text-paper/70">
            <span className={cn("h-2 w-2", playing ? "blink" : "")} style={{ background: playing ? PAL_ACCENT[pal] : "#555" }} />
            <span>{playing ? `${t.common.play} · ${step + 1}/${STEPS}` : t.common.stop}</span>
            <span className="ml-auto">{bpm} {tt.bpm} · {tt.palettes[pal]}</span>
          </div>
        </div>
      }
      panel={
        <>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant={playing ? "signal" : "lime"} className="min-h-12 text-[13px]" icon={playing ? <Square size={16} /> : <Play size={16} />} onClick={() => (playing ? stop() : start())}>
              {playing ? t.common.stop : t.common.play}
            </Btn>
            <Btn className="min-h-12" icon={muted ? <VolumeX size={16} /> : <Volume2 size={16} />} onClick={() => setMuted((m) => !m)} aria-pressed={muted}>
              {muted ? tt.unmute : tt.mute}
            </Btn>
          </div>
          {noAudio && <p className="border-2 border-ink bg-lav p-2 font-mono text-[11px]">{tt.noAudio}</p>}
          {muted && playing && <p className="font-mono text-[11px] text-ink/60">{tt.muted}</p>}
          <PanelSection title={t.common.controls}>
            <Slider label={tt.tempo} value={bpm} min={60} max={200} onChange={setBpm} format={(v) => `${v} ${tt.bpm}`} />
            <Slider label={tt.volume} value={volume} min={0} max={1} step={0.01} onChange={setVolume} format={(v) => Math.round(v * 100) + "%"} />
            <Segmented label={tt.palette} value={pal} onChange={setPal} options={PALS.map((p) => ({ value: p, label: tt.palettes[p] }))} />
          </PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <Btn icon={<Shuffle size={14} />} onClick={() => setPattern(randomPattern())}>{t.common.randomize}</Btn>
            <Btn icon={<Eraser size={14} />} onClick={() => setPattern(empty())}>{tt.clear}</Btn>
            <Btn icon={<Link2 size={14} />} onClick={share}>{t.common.copyLink}</Btn>
            <Btn variant="ink" icon={<RotateCcw size={14} />} onClick={reset}>{t.common.reset}</Btn>
          </div>
          <p className="font-mono text-[10.5px] leading-relaxed text-ink/55">{t.common.shareNote}</p>
        </>
      }
    />
  );
}
