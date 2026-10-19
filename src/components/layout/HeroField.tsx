import { useEffect, useRef } from "react";
import { fitCanvas } from "@/lib/export";
import { isLowPower, useLatest, useReducedMotion } from "@/lib/hooks";
import { blip } from "@/lib/uiSound";

interface Thing {
  hx: number; hy: number; x: number; y: number; vx: number; vy: number;
  a: number; va: number; s: number; kind: number; color: string; glyph: string;
}

const COLORS = ["#D8FF3E", "#3457FF", "#FF6238", "#C8B8FF", "#191919"];
const GLYPHS = ["✦", "☺", "♪", "★", "?", "!", "@", "&", "∞", "☁"];
const EMOJI = ["🍕", "🦆", "🪐", "🧃", "👾", "🎈", "🐸", "🍩"];

interface Props {
  label: string;
  party: boolean;
  onPointer: (p: { x: number; y: number; inside: boolean }) => void;
  onShake: () => void;
}

/** Interactive hero composition — spring-anchored shapes that scatter from the pointer. */
export default function HeroField({ label, party, onPointer, onShake }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const ptr = useRef({ x: -999, y: -999, vx: 0, vy: 0, inside: false, down: false });
  const speedAcc = useRef(0);
  const cb = useLatest({ onPointer, onShake, party, reduced });

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0, W = 0, H = 0, dpr = 1;
    let things: Thing[] = [];
    let time = 0;

    const build = () => {
      const r = fitCanvas(cv);
      W = r.w; H = r.h; dpr = r.dpr;
      const n = Math.round(Math.min(isLowPower() ? 46 : 90, (W * H) / 9000));
      things = [];
      // jittered grid layout so things never clump
      const cols = Math.ceil(Math.sqrt((n * W) / H));
      const rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const cx = (i % cols + 0.5 + (Math.random() - 0.5) * 0.7) * (W / cols);
        const cy = (Math.floor(i / cols) + 0.5 + (Math.random() - 0.5) * 0.7) * (H / rows);
        things.push({
          hx: cx, hy: cy, x: cx, y: cy, vx: 0, vy: 0, a: Math.random() * 6, va: 0,
          s: 9 + Math.random() * 16, kind: Math.floor(Math.random() * 5),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        });
      }
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(cv);

    const draw = () => {
      const p = ptr.current;
      const { reduced: rm, party } = cb.current;
      time += rm ? 0.003 : 0.012;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // pointer crosshair
      if (p.inside) {
        ctx.strokeStyle = "rgba(25,25,25,0.18)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, H); ctx.moveTo(0, p.y); ctx.lineTo(W, p.y); ctx.stroke();
        ctx.strokeStyle = "#191919"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.down ? 30 : 90, 0, Math.PI * 2); ctx.setLineDash([3, 5]); ctx.stroke(); ctx.setLineDash([]);
      }

      for (let i = 0; i < things.length; i++) {
        const t = things[i];
        // idle drift around home
        const ox = rm ? 0 : Math.sin(time + i) * 6, oy = rm ? 0 : Math.cos(time * 1.3 + i * 0.7) * 6;
        let ax = (t.hx + ox - t.x) * 0.02, ay = (t.hy + oy - t.y) * 0.02;
        if (p.inside) {
          const dx = t.x - p.x, dy = t.y - p.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const R = p.down ? 180 : 110;
          if (d < R) {
            const f = (1 - d / R) * (p.down ? 5 : 2.6);
            ax += (dx / d) * f + p.vx * 0.02; ay += (dy / d) * f + p.vy * 0.02;
            t.va += (p.vx * dy - p.vy * dx) * 0.00002;
          }
        }
        t.vx = (t.vx + ax) * 0.88; t.vy = (t.vy + ay) * 0.88;
        t.x += t.vx; t.y += t.vy;
        t.va *= 0.95; t.a += t.va + (rm ? 0 : 0.002);

        ctx.save();
        ctx.translate(t.x, t.y); ctx.rotate(t.a);
        ctx.fillStyle = t.color; ctx.strokeStyle = "#191919"; ctx.lineWidth = 1.5;
        const s = t.s;
        if (party) {
          ctx.font = `${s * 1.8}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(EMOJI[i % EMOJI.length], 0, 0);
        } else {
          ctx.beginPath();
          switch (t.kind) {
            case 0: ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); break;
            case 1: ctx.rect(-s / 2, -s / 2, s, s); ctx.fill(); ctx.stroke(); break;
            case 2: ctx.moveTo(0, -s * 0.6); ctx.lineTo(s * 0.55, s * 0.4); ctx.lineTo(-s * 0.55, s * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
            case 3: ctx.rect(-s * 0.8, -s * 0.15, s * 1.6, s * 0.3); ctx.fill(); ctx.stroke(); break;
            default:
              ctx.fillStyle = "#191919";
              ctx.font = `700 ${s * 1.4}px "Bricolage Grotesque", sans-serif`;
              ctx.textAlign = "center"; ctx.textBaseline = "middle";
              ctx.fillText(t.glyph, 0, 0);
          }
        }
        ctx.restore();
      }
      p.vx *= 0.85; p.vy *= 0.85;
      speedAcc.current *= 0.96;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [cb]);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const move = (e: React.PointerEvent) => {
    const p = ptr.current;
    const n = pos(e);
    if (p.inside) { p.vx = n.x - p.x; p.vy = n.y - p.y; }
    p.x = n.x; p.y = n.y; p.inside = true;
    speedAcc.current += Math.hypot(p.vx, p.vy);
    if (speedAcc.current > 2200) { speedAcc.current = 0; cb.current.onShake(); }
    cb.current.onPointer({ x: n.x, y: n.y, inside: true });
  };
  const leave = () => { ptr.current.inside = false; ptr.current.down = false; cb.current.onPointer({ x: 0, y: 0, inside: false }); };

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className="absolute inset-0 h-full w-full touch-pan-y"
      onPointerMove={move}
      onPointerEnter={move}
      onPointerLeave={leave}
      onPointerCancel={leave}
      onPointerDown={(e) => { move(e); ptr.current.down = true; blip(220 + Math.random() * 200, 0.08, "sine", 0.05); }}
      onPointerUp={(e) => { ptr.current.down = false; if (e.pointerType !== "mouse") leave(); }}
    />
  );
}
