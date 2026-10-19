import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Shuffle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { downloadCanvas, fitCanvas } from "@/lib/export";
import { isLowPower, useLatest, useReducedMotion } from "@/lib/hooks";
import { blip } from "@/lib/uiSound";
import { Btn, ControlGroup, Segmented, Slider, Toggle } from "@/components/controls/Controls";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { PanelSection, StageReadout, ToyLayout, type ToyProps } from "./ToyLayout";

type Pattern = "swarm" | "orbit" | "explosion" | "flow";
type Force = "attract" | "repel";

const PALETTES: { name: string; bg: string; colors: string[] }[] = [
  { name: "Toybox", bg: "#191919", colors: ["#D8FF3E", "#3457FF", "#FF6238", "#C8B8FF", "#F5F3EC"] },
  { name: "Lime", bg: "#191919", colors: ["#D8FF3E", "#B5E61D", "#EFFFB0", "#7FA80F"] },
  { name: "Paper", bg: "#F5F3EC", colors: ["#191919", "#3457FF", "#FF6238"] },
  { name: "Cobalt", bg: "#0E1A66", colors: ["#3457FF", "#8FA2FF", "#C8B8FF", "#F5F3EC"] },
  { name: "Ember", bg: "#1C0E08", colors: ["#FF6238", "#FFB199", "#FFD23E", "#F5F3EC"] },
];
const PATTERNS: Pattern[] = ["swarm", "orbit", "explosion", "flow"];

export default function ParticleToy({ surprise }: ToyProps) {
  const { t } = useI18n();
  const tt = t.toys["particle-orchestra"];
  const toast = useToast();
  const reduced = useReducedMotion();
  const low = useRef(isLowPower()).current;
  const maxCount = low ? 3000 : 8000;
  const defCount = low ? 1200 : 3000;

  const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const [count, setCount] = useState(defCount);
  const [strength, setStrength] = useState(1);
  const [speed, setSpeed] = useState(reduced ? 0.4 : 1);
  const [pattern, setPattern] = useState<Pattern>(surprise ? rnd(PATTERNS) : "swarm");
  const [palette, setPalette] = useState(surprise ? Math.floor(Math.random() * PALETTES.length) : 0);
  const [force, setForce] = useState<Force>("attract");
  const [fade, setFade] = useState(!reduced);
  const [paused, setPaused] = useState(false);
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0, y: 0, inside: false, down: false });
  const bursts = useRef<{ x: number; y: number; r: number; life: number }[]>([]);
  const pendingBurst = useRef<{ x: number; y: number } | null>(null);
  const settings = useLatest({ count, strength, speed, pattern, palette, force, fade, paused });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0, W = 0, H = 0, dpr = 1;
    const N = maxCount;
    const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const seed = new Float32Array(N), col = new Uint8Array(N);
    let time = 0, lastAuto = 0, frames = 0, fpsT = performance.now();

    const resize = () => {
      const r = fitCanvas(canvas, low ? 1.5 : 2);
      const first = W === 0;
      W = r.w; H = r.h; dpr = r.dpr;
      if (first) {
        for (let i = 0; i < N; i++) {
          x[i] = Math.random() * W; y[i] = Math.random() * H; seed[i] = Math.random(); col[i] = Math.floor(Math.random() * 255);
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = PALETTES[settings.current.palette].bg;
      ctx.fillRect(0, 0, W, H);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const burst = (bx: number, by: number, power: number, n: number) => {
      bursts.current.push({ x: bx, y: by, r: 0, life: 1 });
      for (let i = 0; i < n; i++) {
        const dx = x[i] - bx, dy = y[i] - by;
        const d = Math.sqrt(dx * dx + dy * dy) + 1;
        const f = (power * 900) / (d + 60);
        vx[i] += (dx / d) * f; vy[i] += (dy / d) * f;
      }
    };

    const loop = (now: number) => {
      const s = settings.current;
      const pal = PALETTES[s.palette];
      const n = Math.min(s.count, N);
      frames++;
      if (now - fpsT > 1000) { setFps(frames); frames = 0; fpsT = now; }

      if (pendingBurst.current) {
        burst(pendingBurst.current.x, pendingBurst.current.y, 1.4 * s.strength, n);
        pendingBurst.current = null;
      }

      if (!s.paused) {
        time += 0.016 * s.speed;
        const p = pointer.current;
        const cx = p.inside ? p.x : W / 2, cy = p.inside ? p.y : H / 2;
        const sign = s.force === "attract" ? 1 : -1;
        const st = s.strength;
        const sp = s.speed;

        if (s.pattern === "explosion" && time - lastAuto > 2.6) {
          lastAuto = time;
          burst(W * (0.25 + Math.random() * 0.5), H * (0.25 + Math.random() * 0.5), 1.2, n);
        }

        for (let i = 0; i < n; i++) {
          let ax = 0, ay = 0;
          const sd = seed[i];
          switch (s.pattern) {
            case "swarm": {
              const ang = Math.sin(sd * 40 + time * 1.3) * Math.PI + Math.cos(y[i] * 0.004 + time) * 2;
              ax += Math.cos(ang) * 0.6; ay += Math.sin(ang) * 0.6;
              if (p.inside) {
                const dx = cx - x[i], dy = cy - y[i];
                const d = Math.sqrt(dx * dx + dy * dy) + 1;
                const f = (sign * st * 2.2 * Math.min(1, 220 / d));
                ax += (dx / d) * f; ay += (dy / d) * f;
              }
              break;
            }
            case "orbit": {
              const dx = x[i] - cx, dy = y[i] - cy;
              const d = Math.sqrt(dx * dx + dy * dy) + 1;
              const target = 40 + sd * Math.min(W, H) * 0.45;
              const radial = (target - d) * 0.02 * st * sign;
              ax += (dx / d) * radial; ay += (dy / d) * radial;
              const tang = (1.2 + (1 - sd) * 1.8) * (sd > 0.5 ? 1 : -1) * 0.6;
              ax += (-dy / d) * tang; ay += (dx / d) * tang;
              break;
            }
            case "explosion": {
              const hx = W / 2 + Math.cos(sd * Math.PI * 2 * 7) * Math.min(W, H) * 0.3 * (0.3 + sd);
              const hy = H / 2 + Math.sin(sd * Math.PI * 2 * 7) * Math.min(W, H) * 0.3 * (0.3 + sd);
              ax += (hx - x[i]) * 0.004; ay += (hy - y[i]) * 0.004;
              if (p.inside) {
                const dx = cx - x[i], dy = cy - y[i];
                const d = Math.sqrt(dx * dx + dy * dy) + 1;
                if (d < 160) { ax += (dx / d) * sign * st * 1.5; ay += (dy / d) * sign * st * 1.5; }
              }
              break;
            }
            case "flow": {
              const ang = Math.sin(x[i] * 0.006 + time * 0.5) * 2 + Math.cos(y[i] * 0.006 - time * 0.4) * 2 + sd * 0.4;
              ax += Math.cos(ang) * 0.9; ay += Math.sin(ang) * 0.9;
              if (p.inside) {
                const dx = cx - x[i], dy = cy - y[i];
                const d = Math.sqrt(dx * dx + dy * dy) + 1;
                if (d < 200) { const f = sign * st * 1.6 * (1 - d / 200); ax += (dx / d) * f; ay += (dy / d) * f; }
              }
              break;
            }
          }
          vx[i] = (vx[i] + ax * sp) * 0.94;
          vy[i] = (vy[i] + ay * sp) * 0.94;
          x[i] += vx[i] * sp; y[i] += vy[i] * sp;
          if (x[i] < 0) x[i] += W; else if (x[i] > W) x[i] -= W;
          if (y[i] < 0) y[i] += H; else if (y[i] > H) y[i] -= H;
        }
      }

      // render
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      if (s.fade && !s.paused) {
        ctx.fillStyle = pal.bg;
        ctx.globalAlpha = 0.18;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      } else if (!s.paused) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, W, H);
      }
      if (!s.paused) {
        const nc = pal.colors.length;
        for (let c = 0; c < nc; c++) {
          ctx.fillStyle = pal.colors[c];
          for (let i = 0; i < n; i++) {
            if (col[i] % nc !== c) continue;
            const v = Math.abs(vx[i]) + Math.abs(vy[i]);
            const sz = 1.2 + Math.min(2.4, v * 0.25);
            ctx.fillRect(x[i], y[i], sz, sz);
          }
        }
        // burst rings
        const br = bursts.current;
        for (let i = br.length - 1; i >= 0; i--) {
          const b = br[i];
          b.r += 9 * s.speed; b.life -= 0.022 * s.speed;
          if (b.life <= 0) { br.splice(i, 1); continue; }
          ctx.strokeStyle = pal.colors[0];
          ctx.globalAlpha = b.life;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    Object.assign(pointer.current, { ...p, inside: true, down: true });
    pendingBurst.current = p;
    blip(200 + Math.random() * 300, 0.12, "sine", 0.06);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = pos(e);
    Object.assign(pointer.current, { ...p, inside: e.pointerType === "mouse" || e.buttons > 0 });
  };
  const onLeave = () => { pointer.current.inside = false; pointer.current.down = false; };

  const reset = () => {
    setCount(defCount); setStrength(1); setSpeed(reduced ? 0.4 : 1); setPattern("swarm"); setPalette(0); setForce("attract"); setFade(!reduced); setPaused(false);
  };
  const randomize = () => {
    setPattern(rnd(PATTERNS)); setPalette(Math.floor(Math.random() * PALETTES.length));
    setForce(rnd<Force>(["attract", "repel"])); setStrength(0.5 + Math.random() * 1.8); setSpeed(0.5 + Math.random() * 1.2);
  };
  const exportPng = () => { if (canvasRef.current && downloadCanvas(canvasRef.current, "particle-orchestra")) toast(t.common.exported); };
  const onKey = (e: React.KeyboardEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); pendingBurst.current = { x: r.width / 2, y: r.height / 2 }; }
    if (e.key.toLowerCase() === "p") setPaused((v) => !v);
  };

  const pal = PALETTES[palette];
  return (
    <ToyLayout
      stage={
        <>
          <canvas
            ref={canvasRef} tabIndex={0}
            aria-label={`${tt.title}. ${tt.long} Keyboard: Space bursts, P pauses.`}
            className="block h-full w-full cursor-crosshair touch-none select-none"
            style={{ background: pal.bg }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={(e) => { pointer.current.down = false; if (e.pointerType !== "mouse") onLeave(); }}
            onPointerLeave={onLeave} onPointerCancel={onLeave} onKeyDown={onKey}
          />
          <StageReadout className={pal.bg === "#F5F3EC" ? "text-ink" : "text-paper/80"}>
            <div>{tt.patterns[pattern]} · {Math.min(count, maxCount).toLocaleString()} pts · {fps} fps</div>
            {paused && <div className="mt-1 inline-block bg-lime px-1.5 text-ink">❚❚ {t.common.pause}</div>}
          </StageReadout>
        </>
      }
      panel={
        <>
          <PanelSection title={t.common.controls}>
            <Segmented label={tt.pattern} value={pattern} onChange={setPattern} options={PATTERNS.map((p) => ({ value: p, label: tt.patterns[p] }))} />
            <Segmented label={tt.force} value={force} onChange={setForce} options={[{ value: "attract", label: tt.forces.attract }, { value: "repel", label: tt.forces.repel }]} />
            <Slider label={tt.count} value={count} min={200} max={maxCount} step={100} onChange={setCount} format={(v) => v.toLocaleString()} />
            <Slider label={tt.strength} value={strength} min={0.1} max={3} step={0.05} onChange={setStrength} format={(v) => v.toFixed(2)} />
            <Slider label={tt.speed} value={speed} min={0.1} max={2.5} step={0.05} onChange={setSpeed} format={(v) => v.toFixed(2) + "×"} />
            <ControlGroup label={tt.palette} value={pal.name}>
              <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={tt.palette}>
                {PALETTES.map((p, i) => (
                  <button key={p.name} type="button" role="radio" aria-checked={palette === i} aria-label={p.name}
                    onClick={() => setPalette(i)}
                    className={cn("flex h-9 flex-col overflow-hidden border-2 border-ink", palette === i && "shadow-[2px_2px_0_#191919] -translate-y-0.5")}>
                    <span className="flex-1" style={{ background: p.bg }} />
                    <span className="flex h-2.5">{p.colors.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
                  </button>
                ))}
              </div>
            </ControlGroup>
            <Toggle label={tt.fade} checked={fade} onChange={setFade} />
          </PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="lime" icon={paused ? <Play size={14} /> : <Pause size={14} />} onClick={() => setPaused((v) => !v)}>{paused ? t.common.resume : t.common.pause}</Btn>
            <Btn icon={<Shuffle size={14} />} onClick={randomize}>{t.common.randomize}</Btn>
            <Btn icon={<Download size={14} />} onClick={exportPng}>{t.common.export}</Btn>
            <Btn variant="ink" icon={<RotateCcw size={14} />} onClick={reset}>{t.common.reset}</Btn>
          </div>
          <p className="font-mono text-[10.5px] text-ink/55">⌨ Space · P</p>
        </>
      }
    />
  );
}
