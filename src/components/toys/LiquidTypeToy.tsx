import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, Shuffle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { downloadCanvas, fitCanvas } from "@/lib/export";
import { useLatest, useReducedMotion } from "@/lib/hooks";
import { Btn, ControlGroup, Segmented, Slider, Swatches, Toggle } from "@/components/controls/Controls";
import { useToast } from "@/components/ui/Toast";
import { PanelSection, StageReadout, ToyLayout, type ToyProps } from "./ToyLayout";

type Mode = "ripple" | "magnet" | "melt" | "twist";

const INKS = ["#191919", "#3457FF", "#FF6238", "#D8FF3E", "#F5F3EC", "#C8B8FF"];
const BGS = ["#F5F3EC", "#D8FF3E", "#3457FF", "#191919", "#FF6238", "#C8B8FF"];
const RANDOM_TEXT = ["JELLY", "WOBBLE", "HELLO\nWORLD", "BLOOP", "404 VIBES", "GOOEY", "MELTDOWN", "SANTUY", "MANTAP", "NO THOUGHTS"];

const MODE_PARAMS: Record<Mode, { k: number; c: number; damp: number }> = {
  ripple: { k: 0.012, c: 0.24, damp: 0.986 },
  magnet: { k: 0.07, c: 0.06, damp: 0.84 },
  melt: { k: 0.0035, c: 0.12, damp: 0.9 },
  twist: { k: 0.045, c: 0.1, damp: 0.87 },
};

export default function LiquidTypeToy({ surprise }: ToyProps) {
  const { t } = useI18n();
  const tt = t.toys["liquid-type"];
  const toast = useToast();
  const reduced = useReducedMotion();
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

  const defaults = { text: tt.defaultText, size: 140, intensity: 1, mode: "ripple" as Mode, ink: "#191919", bg: "#F5F3EC", effect: true };
  const [text, setText] = useState(surprise ? pick(RANDOM_TEXT) : defaults.text);
  const [fontSize, setFontSize] = useState(defaults.size);
  const [intensity, setIntensity] = useState(defaults.intensity);
  const [mode, setMode] = useState<Mode>(surprise ? pick<Mode>(["ripple", "magnet", "melt", "twist"]) : "ripple");
  const [ink, setInk] = useState(surprise ? "#F5F3EC" : defaults.ink);
  const [bg, setBg] = useState(surprise ? "#3457FF" : defaults.bg);
  const [effect, setEffect] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textCanvas = useRef<HTMLCanvasElement | null>(null);
  const mesh = useRef<{ cols: number; rows: number; cell: number; dx: Float32Array; dy: Float32Array; vx: Float32Array; vy: Float32Array; mask: Uint8Array } | null>(null);
  const pointer = useRef({ x: -9999, y: -9999, vx: 0, vy: 0, active: false });
  const dirty = useRef(true);
  const settings = useLatest({ mode, intensity, bg, effect, reduced });

  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true));
  }, []);

  // whenever text appearance changes, mark re-render
  useEffect(() => { dirty.current = true; }, [text, fontSize, ink, fontsReady]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let W = 0, H = 0, dpr = 1;

    const buildText = () => {
      const r = fitCanvas(canvas);
      W = canvas.width; H = canvas.height; dpr = r.dpr;
      const tc = textCanvas.current ?? document.createElement("canvas");
      textCanvas.current = tc;
      tc.width = W; tc.height = H;
      const tx = tc.getContext("2d", { willReadFrequently: true })!;
      tx.clearRect(0, 0, W, H);
      const s = settingsText.current;
      const lines = (s.text || " ").toUpperCase().split("\n").slice(0, 4);
      let fs = s.size * dpr * (r.w < 640 ? 0.6 : 1);
      tx.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
      const maxW = Math.max(...lines.map((l) => tx.measureText(l).width));
      if (maxW > W * 0.9) fs *= (W * 0.9) / maxW;
      const lh = fs * 0.92;
      if (lh * lines.length > H * 0.86) fs *= (H * 0.86) / (lh * lines.length);
      tx.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
      tx.fillStyle = s.ink;
      tx.textAlign = "center";
      tx.textBaseline = "middle";
      const total = fs * 0.92 * lines.length;
      lines.forEach((l, i) => tx.fillText(l, W / 2, H / 2 - total / 2 + fs * 0.92 * (i + 0.5)));

      const cell = Math.round((r.w < 640 ? 10 : 8) * dpr);
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      const data = tx.getImageData(0, 0, W, H).data;
      const mask = new Uint8Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let found = 0;
        for (let yy = j * cell; yy < Math.min(H, (j + 1) * cell) && !found; yy += 2)
          for (let xx = i * cell; xx < Math.min(W, (i + 1) * cell); xx += 2)
            if (data[(yy * W + xx) * 4 + 3] > 8) { found = 1; break; }
        mask[j * cols + i] = found;
      }
      const n = cols * rows;
      const prev = mesh.current;
      mesh.current = prev && prev.cols === cols && prev.rows === rows
        ? { ...prev, mask }
        : { cols, rows, cell, mask, dx: new Float32Array(n), dy: new Float32Array(n), vx: new Float32Array(n), vy: new Float32Array(n) };
      dirty.current = false;
    };

    const ro = new ResizeObserver(() => { dirty.current = true; });
    ro.observe(canvas);

    // intro swipe to show it's alive
    let intro = settings.current.reduced ? 1 : 0;

    const loop = () => {
      if (dirty.current) buildText();
      const m = mesh.current!;
      const s = settings.current;
      const { cols, rows, cell, dx, dy, vx, vy, mask } = m;
      const P = MODE_PARAMS[s.mode];
      const p = pointer.current;

      if (intro < 1) {
        intro += 0.012;
        p.active = true;
        p.x = intro * W; p.y = H / 2 + Math.sin(intro * 9) * H * 0.12;
        p.vx = W * 0.012; p.vy = Math.cos(intro * 9) * 6;
        if (intro >= 1) p.active = false;
      }

      const R = (70 + 50 * s.intensity) * dpr;
      const R2 = R * R;
      const I = s.intensity;
      if (s.effect) {
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const k = j * cols + i;
            let fx = -P.k * dx[k], fy = -P.k * dy[k];
            const l = i > 0 ? k - 1 : k, r = i < cols - 1 ? k + 1 : k, u = j > 0 ? k - cols : k, d = j < rows - 1 ? k + cols : k;
            fx += P.c * ((dx[l] + dx[r] + dx[u] + dx[d]) / 4 - dx[k]) * 4 * 0.25;
            fy += P.c * ((dy[l] + dy[r] + dy[u] + dy[d]) / 4 - dy[k]) * 4 * 0.25;
            if (p.active) {
              const nx = i * cell + cell / 2 + dx[k], ny = j * cell + cell / 2 + dy[k];
              const ddx = p.x - nx, ddy = p.y - ny;
              const dist2 = ddx * ddx + ddy * ddy;
              if (dist2 < R2) {
                const f = 1 - Math.sqrt(dist2) / R;
                const ff = f * f * I;
                switch (s.mode) {
                  case "ripple": fx += p.vx * 0.09 * ff; fy += p.vy * 0.09 * ff; break;
                  case "magnet": fx += ddx * 0.035 * ff; fy += ddy * 0.035 * ff; break;
                  case "melt": fy += 0.9 * ff * dpr; fx += p.vx * 0.02 * ff; break;
                  case "twist": fx += -ddy * 0.03 * ff; fy += ddx * 0.03 * ff; break;
                }
              }
            }
            vx[k] = (vx[k] + fx) * P.damp;
            vy[k] = (vy[k] + fy) * P.damp;
          }
        }
        const lim = 160 * dpr;
        for (let k = 0; k < dx.length; k++) {
          dx[k] = Math.max(-lim, Math.min(lim, dx[k] + vx[k]));
          dy[k] = Math.max(-lim, Math.min(lim, dy[k] + vy[k]));
        }
      }
      p.vx *= 0.8; p.vy *= 0.8;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, W, H);
      const tc = textCanvas.current!;
      if (!s.effect) {
        ctx.drawImage(tc, 0, 0);
      } else {
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          if (!mask[k]) continue;
          const sx = i * cell, sy = j * cell;
          // tile stretch based on neighbor gradient for a smoother look
          const kr = i < cols - 1 ? k + 1 : k, kd = j < rows - 1 ? k + cols : k;
          const sw = cell + (dx[kr] - dx[k]) + 1, sh = cell + (dy[kd] - dy[k]) + 1;
          ctx.drawImage(tc, sx, sy, cell, cell, sx + dx[k], sy + dy[k], Math.max(1, sw), Math.max(1, sh));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settingsText = useLatest({ text, size: fontSize, ink });

  const toLocal = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const dpr = canvasRef.current!.width / r.width;
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = pointer.current;
    const n = toLocal(e);
    if (p.x > -9000) { p.vx = n.x - p.x; p.vy = n.y - p.y; }
    p.x = n.x; p.y = n.y;
    p.active = e.pointerType === "mouse" ? true : e.buttons > 0;
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const n = toLocal(e);
    Object.assign(pointer.current, { x: n.x, y: n.y, vx: 0, vy: 0, active: true });
  };
  const onLeave = () => { pointer.current.active = false; pointer.current.x = -9999; };

  const resetMesh = () => {
    const m = mesh.current;
    if (m) { m.dx.fill(0); m.dy.fill(0); m.vx.fill(0); m.vy.fill(0); }
  };
  const reset = () => {
    setText(defaults.text); setFontSize(defaults.size); setIntensity(1); setMode("ripple");
    setInk(defaults.ink); setBg(defaults.bg); setEffect(true); resetMesh();
  };
  const randomize = () => {
    setText(pick(RANDOM_TEXT)); setMode(pick<Mode>(["ripple", "magnet", "melt", "twist"]));
    const b = pick(BGS); setBg(b); setInk(pick(INKS.filter((c) => c !== b)));
    setIntensity(0.6 + Math.random() * 1.2);
  };
  const exportPng = () => {
    if (canvasRef.current && downloadCanvas(canvasRef.current, "liquid-type")) toast(t.common.exported);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const m = mesh.current;
    if (!m) return;
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const kx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      const ky = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
      for (let k = 0; k < m.vx.length; k++) { m.vx[k] += kx * 6 * Math.random(); m.vy[k] += ky * 6 * Math.random(); }
    }
  };

  return (
    <ToyLayout
      stage={
        <>
          <canvas
            ref={canvasRef} tabIndex={0}
            role="img"
            aria-label={`${tt.title}: "${text}". ${tt.long} Arrow keys wobble the text.`}
            className="block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerMove={onMove} onPointerDown={onDown} onPointerUp={(e) => { if (e.pointerType !== "mouse") onLeave(); }}
            onPointerLeave={onLeave} onPointerCancel={onLeave} onKeyDown={onKey}
          />
          <StageReadout>
            <span className="border border-current px-1.5 py-0.5" style={{ color: ink, background: bg }}>{tt.modes[mode]} · {Math.round(intensity * 100)}%</span>
          </StageReadout>
        </>
      }
      panel={
        <>
          <PanelSection title={t.common.controls}>
            <ControlGroup label={tt.text} value={`${text.length}/32`}>
              <textarea
                value={text} maxLength={32} rows={2} placeholder={tt.placeholder}
                onChange={(e) => setText(e.target.value)}
                className="w-full resize-none border-2 border-ink bg-paper px-3 py-2 font-display text-lg font-extrabold uppercase leading-tight outline-none focus:bg-lime/30"
              />
            </ControlGroup>
            <Slider label={tt.size} value={fontSize} min={40} max={260} onChange={setFontSize} format={(v) => v + "px"} />
            <Slider label={tt.intensity} value={intensity} min={0} max={2} step={0.05} onChange={setIntensity} format={(v) => Math.round(v * 100) + "%"} />
            <Segmented label={tt.mode} value={mode} onChange={(m) => { setMode(m); }}
              options={(["ripple", "magnet", "melt", "twist"] as Mode[]).map((m) => ({ value: m, label: tt.modes[m] }))} />
            <Toggle label={tt.effect} checked={effect} onChange={(v) => { setEffect(v); if (!v) resetMesh(); }} />
            <Swatches label={tt.ink} colors={INKS} value={ink} onChange={setInk} />
            <Swatches label={tt.bg} colors={BGS} value={bg} onChange={setBg} />
          </PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="lime" icon={<Download size={14} />} onClick={exportPng}>{t.common.export}</Btn>
            <Btn icon={<Shuffle size={14} />} onClick={randomize}>{t.common.randomize}</Btn>
            <Btn variant="ink" className="col-span-2" icon={<RotateCcw size={14} />} onClick={reset}>{t.common.reset}</Btn>
          </div>
        </>
      }
    />
  );
}
