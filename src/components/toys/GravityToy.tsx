import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, RotateCcw, Waves } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fitCanvas } from "@/lib/export";
import { useLatest, useReducedMotion } from "@/lib/hooks";
import { blip } from "@/lib/uiSound";
import { Btn, Segmented, Slider, Toggle } from "@/components/controls/Controls";
import { PanelSection, StageReadout, ToyLayout, type ToyProps } from "./ToyLayout";

type Mode = "normal" | "zero" | "reverse";
type Kind = "mix" | "emoji" | "words" | "shapes";
type ShapeName = "circle" | "square" | "triangle" | "star" | "ring";

interface Body {
  x: number; y: number; vx: number; vy: number;
  r: number; a: number; va: number; m: number;
  type: "emoji" | "word" | "shape";
  label: string; shape: ShapeName; color: string; ink: string;
}

const EMOJI = ["🍕", "🪐", "🦆", "🍩", "💾", "🧃", "🎈", "🐸", "🌶️", "🧠", "🍄", "⭐", "🫧", "🎲", "🥐", "👾"];
const WORDS_EN = ["wow", "lol", "ok", "nope", "yes", "bonk", "hmm", "yay", "meh", "boop", "uwu", "brb"];
const WORDS_ID = ["anjay", "wkwk", "gas", "santuy", "mantap", "yaudah", "ngab", "gaskeun", "lho", "duh", "asik", "hah"];
const COLORS = [
  ["#D8FF3E", "#191919"], ["#3457FF", "#F5F3EC"], ["#FF6238", "#191919"], ["#C8B8FF", "#191919"], ["#191919", "#D8FF3E"],
] as const;
const SHAPES: ShapeName[] = ["circle", "square", "triangle", "star", "ring"];
const MAX_BODIES = 260;
const G = 1700;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export default function GravityToy({ surprise }: ToyProps) {
  const { t, lang } = useI18n();
  const tt = t.toys.gravity;
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodies = useRef<Body[]>([]);
  const size = useRef({ w: 800, h: 600 });
  const emojiCache = useRef(new Map<string, HTMLCanvasElement>());
  const drag = useRef<{ body: Body; px: number; py: number; lx: number; ly: number; lt: number } | null>(null);

  const [mode, setMode] = useState<Mode>(surprise ? pick(["normal", "zero", "reverse"] as Mode[]) : "normal");
  const [strength, setStrength] = useState(1);
  const [objSize, setObjSize] = useState(28);
  const [density, setDensity] = useState(3);
  const [trails, setTrails] = useState(surprise);
  const [walls, setWalls] = useState(true);
  const [kind, setKind] = useState<Kind>("mix");
  const [count, setCount] = useState(0);

  const settings = useLatest({ mode, strength, objSize, density, trails, walls, kind, lang });

  const makeBody = useCallback((x: number, y: number, k?: Kind): Body => {
    const s = settings.current;
    const kk = k ?? s.kind;
    const type: Body["type"] = kk === "mix" ? pick(["emoji", "word", "shape", "shape"] as const) : kk === "emoji" ? "emoji" : kk === "words" ? "word" : "shape";
    const r = s.objSize * (0.7 + Math.random() * 0.6) * (type === "word" ? 1.25 : 1);
    const [color, ink] = pick(COLORS);
    return {
      x, y, vx: (Math.random() - 0.5) * 420, vy: (Math.random() - 0.5) * 420 - 120,
      r, a: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 4, m: r * r,
      type, label: type === "emoji" ? pick(EMOJI) : pick(s.lang === "id" ? WORDS_ID : WORDS_EN),
      shape: pick(SHAPES), color, ink,
    };
  }, [settings]);

  const spawn = useCallback((x: number, y: number, n: number) => {
    const arr = bodies.current;
    for (let i = 0; i < n; i++) arr.push(makeBody(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20));
    while (arr.length > MAX_BODIES) arr.shift();
    setCount(arr.length);
  }, [makeBody]);

  const seed = useCallback((n: number) => {
    bodies.current = [];
    const { w, h } = size.current;
    for (let i = 0; i < n; i++) {
      const b = makeBody(40 + Math.random() * (w - 80), 40 + Math.random() * (h * 0.6));
      bodies.current.push(b);
    }
    setCount(bodies.current.length);
  }, [makeBody]);

  const quake = useCallback(() => {
    blip(90, 0.25, "sawtooth", 0.05);
    for (const b of bodies.current) {
      b.vx += (Math.random() - 0.5) * 1400;
      b.vy += (Math.random() - 0.5) * 1400 - 300;
      b.va += (Math.random() - 0.5) * 12;
    }
  }, []);

  const reset = () => {
    setMode("normal"); setStrength(1); setObjSize(28); setDensity(3); setTrails(false); setWalls(true); setKind("mix");
    requestAnimationFrame(() => seed(24));
  };

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let dpr = 1;

    const resize = () => {
      const r = fitCanvas(canvas);
      size.current = { w: r.w, h: r.h };
      dpr = r.dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (bodies.current.length === 0) seed(surprise ? 60 : 24);

    const getEmoji = (e: string, px: number) => {
      const key = e + "|" + px;
      let c = emojiCache.current.get(key);
      if (!c) {
        c = document.createElement("canvas");
        const s = Math.ceil(px * 1.4 * dpr);
        c.width = c.height = s;
        const x = c.getContext("2d")!;
        x.font = `${px * dpr}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(e, s / 2, s / 2 + px * 0.08 * dpr);
        emojiCache.current.set(key, c);
        if (emojiCache.current.size > 400) emojiCache.current.clear();
      }
      return c;
    };

    const step = (dt: number) => {
      const s = settings.current;
      const { w, h } = size.current;
      const g = s.mode === "zero" ? 0 : (s.mode === "reverse" ? -1 : 1) * G * s.strength;
      const rest = s.walls ? 0.82 : 0.15;
      const arr = bodies.current;
      const dragged = drag.current?.body;

      for (const b of arr) {
        if (b === dragged) continue;
        b.vy += g * dt;
        const damp = s.mode === "zero" ? 0.999 : 0.9985;
        b.vx *= damp; b.vy *= damp;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.a += b.va * dt; b.va *= 0.995;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * rest; b.va += b.vy * 0.002; }
        if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx) * rest; b.va -= b.vy * 0.002; }
        if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy) * rest; b.vx *= 0.98; b.va = b.vx / b.r * 0.6; }
        if (b.y > h - b.r) { b.y = h - b.r; b.vy = -Math.abs(b.vy) * rest; b.vx *= 0.98; b.va = b.vx / b.r * 0.6; }
      }

      // spatial hash collisions
      const cell = 80;
      const grid = new Map<number, number[]>();
      for (let i = 0; i < arr.length; i++) {
        const b = arr[i];
        const k = Math.floor(b.x / cell) * 10007 + Math.floor(b.y / cell);
        const list = grid.get(k);
        if (list) list.push(i); else grid.set(k, [i]);
      }
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const list = grid.get((cx + ox) * 10007 + cy + oy);
          if (!list) continue;
          for (const j of list) {
            if (j <= i) continue;
            const b = arr[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const rr = a.r + b.r;
            const d2 = dx * dx + dy * dy;
            if (d2 >= rr * rr || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const nx = dx / d, ny = dy / d;
            const overlap = rr - d;
            const ia = a === dragged ? 0 : 1 / a.m;
            const ib = b === dragged ? 0 : 1 / b.m;
            const sum = ia + ib || 1;
            a.x -= nx * overlap * (ia / sum); a.y -= ny * overlap * (ia / sum);
            b.x += nx * overlap * (ib / sum); b.y += ny * overlap * (ib / sum);
            const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
            const vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const jImp = (-(1 + 0.45) * vn) / sum;
              a.vx -= jImp * ia * nx; a.vy -= jImp * ia * ny;
              b.vx += jImp * ib * nx; b.vy += jImp * ib * ny;
              const tang = rvx * -ny + rvy * nx;
              a.va -= tang * 0.004; b.va += tang * 0.004;
            }
          }
        }
      }
    };

    const drawShape = (b: Body) => {
      const r = b.r;
      ctx.fillStyle = b.color;
      ctx.strokeStyle = "#191919";
      ctx.lineWidth = 2;
      ctx.beginPath();
      switch (b.shape) {
        case "circle": ctx.arc(0, 0, r, 0, Math.PI * 2); break;
        case "square": ctx.rect(-r * 0.78, -r * 0.78, r * 1.56, r * 1.56); break;
        case "triangle":
          ctx.moveTo(0, -r); ctx.lineTo(r * 0.87, r * 0.5); ctx.lineTo(-r * 0.87, r * 0.5); ctx.closePath(); break;
        case "star":
          for (let i = 0; i < 10; i++) {
            const rad = i % 2 ? r * 0.45 : r;
            const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          }
          ctx.closePath(); break;
        case "ring":
          ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.moveTo(r * 0.45, 0); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2, true); break;
      }
      ctx.fill("evenodd");
      ctx.stroke();
    };

    const draw = () => {
      const s = settings.current;
      const { w, h } = size.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (s.trails) {
        ctx.fillStyle = "rgba(245,243,236,0.16)";
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = "#F5F3EC";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "rgba(25,25,25,0.12)";
        for (let x = 20; x < w; x += 40) for (let y = 20; y < h; y += 40) ctx.fillRect(x, y, 1.5, 1.5);
      }
      for (const b of bodies.current) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        if (b.type === "shape") drawShape(b);
        else if (b.type === "emoji") {
          const px = Math.round(b.r * 1.7);
          const img = getEmoji(b.label, px);
          const s2 = img.width / dpr;
          ctx.drawImage(img, -s2 / 2, -s2 / 2, s2, s2);
        } else {
          ctx.fillStyle = b.color;
          ctx.strokeStyle = "#191919"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = b.ink;
          ctx.font = `700 ${Math.max(10, b.r * 0.62)}px "Bricolage Grotesque", sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(b.label, 0, 1, b.r * 1.7);
        }
        if (drag.current?.body === b) {
          ctx.strokeStyle = "#3457FF"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(0, 0, b.r + 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const sub = 2;
      for (let i = 0; i < sub; i++) step(dt / sub);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pointer handling
  const localPos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = localPos(e);
    let hit: Body | null = null;
    for (let i = bodies.current.length - 1; i >= 0; i--) {
      const b = bodies.current[i];
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + 6) ** 2) { hit = b; break; }
    }
    if (hit) {
      drag.current = { body: hit, px: p.x - hit.x, py: p.y - hit.y, lx: p.x, ly: p.y, lt: performance.now() };
      hit.vx = hit.vy = 0;
      blip(300, 0.05);
    } else {
      spawn(p.x, p.y, settings.current.density);
      blip(500 + Math.random() * 400, 0.05, "triangle");
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = localPos(e);
    const now = performance.now();
    const dt = Math.max(0.008, (now - d.lt) / 1000);
    d.body.vx = (p.x - d.lx) / dt;
    d.body.vy = (p.y - d.ly) / dt;
    d.body.x = p.x - d.px; d.body.y = p.y - d.py;
    d.lx = p.x; d.ly = p.y; d.lt = now;
  };
  const onUp = () => {
    const d = drag.current;
    if (d) {
      const cap = 2600;
      d.body.vx = Math.max(-cap, Math.min(cap, d.body.vx));
      d.body.vy = Math.max(-cap, Math.min(cap, d.body.vy));
      d.body.va = d.body.vx / d.body.r * 0.3;
    }
    drag.current = null;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const { w, h } = size.current;
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); spawn(w * (0.2 + Math.random() * 0.6), h * 0.3, settings.current.density); }
    if (e.key.toLowerCase() === "e") quake();
    if (e.key.toLowerCase() === "g") setMode((m) => (m === "normal" ? "zero" : m === "zero" ? "reverse" : "normal"));
  };

  return (
    <ToyLayout
      stage={
        <>
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={`${tt.title}. ${tt.long} Keyboard: Space spawns, E shakes, G changes gravity.`}
            className="block h-full w-full cursor-crosshair touch-none select-none"
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            onKeyDown={onKey}
          />
          <StageReadout>
            <span className="bg-ink px-1.5 py-0.5 text-lime">{tt.modes[mode]}</span>
            <span className="ml-2 text-ink/60">{count} {tt.objects} · g={mode === "zero" ? "0" : (mode === "reverse" ? "-" : "") + strength.toFixed(2)}</span>
            {reduced && <div className="mt-1 normal-case text-ink/50">{t.common.reducedMotion}</div>}
          </StageReadout>
        </>
      }
      panel={
        <>
          <PanelSection title={t.common.controls}>
            <Segmented label={tt.mode} value={mode} onChange={setMode}
              options={[{ value: "normal", label: tt.modes.normal }, { value: "zero", label: tt.modes.zero }, { value: "reverse", label: tt.modes.reverse }]} />
            <Slider label={tt.strength} value={strength} min={0.1} max={2.5} step={0.05} onChange={setStrength} format={(v) => v.toFixed(2) + "×"} />
            <Segmented label={tt.kind} value={kind} onChange={setKind}
              options={[{ value: "mix", label: tt.kinds.mix }, { value: "emoji", label: tt.kinds.emoji }, { value: "words", label: tt.kinds.words }, { value: "shapes", label: tt.kinds.shapes }]} />
            <Slider label={tt.size} value={objSize} min={12} max={60} onChange={setObjSize} format={(v) => v + "px"} />
            <Slider label={tt.density} value={density} min={1} max={15} onChange={setDensity} />
            <div className="grid grid-cols-1 gap-2">
              <Toggle label={tt.trails} checked={trails} onChange={setTrails} />
              <Toggle label={tt.walls} checked={walls} onChange={setWalls} />
            </div>
          </PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="lime" icon={<Waves size={14} />} onClick={quake}>{tt.shake}</Btn>
            <Btn icon={<Eraser size={14} />} onClick={() => { bodies.current = []; setCount(0); }}>{tt.clear}</Btn>
            <Btn variant="ink" className="col-span-2" icon={<RotateCcw size={14} />} onClick={reset}>{t.common.reset}</Btn>
          </div>
          <p className="font-mono text-[10.5px] leading-relaxed text-ink/55">⌨ Space · E · G</p>
        </>
      }
    />
  );
}
