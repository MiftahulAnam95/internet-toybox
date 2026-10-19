import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eraser, Link2, PaintBucket, Pencil, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { copyText, downloadCanvas } from "@/lib/export";
import { toyUrl } from "@/lib/toys";
import { blip } from "@/lib/uiSound";
import { Btn, ControlGroup, Segmented, Toggle } from "@/components/controls/Controls";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import { PanelSection, ToyLayout, type ToyProps } from "./ToyLayout";

type Tool = "draw" | "erase" | "fill";
type Tpl = "blank" | "heart" | "mushroom" | "ghost" | "flower" | "smile";

/** index 0 = empty */
const PALETTE = ["", "#191919", "#F5F3EC", "#D8FF3E", "#3457FF", "#FF6238", "#C8B8FF", "#FFD23E", "#2BB673", "#8B5A2B", "#FF9EC4", "#7FD4FF", "#9A9A9A", "#5B2BD9", "#E8C9A0", "#FFFFFF"];
const CHAR: Record<string, number> = { ".": 0, k: 1, w: 2, l: 3, b: 4, o: 5, v: 6, y: 7, g: 8, n: 9, p: 10, s: 11, r: 12, u: 13, e: 14, W: 15 };
const SIZES = [16, 24, 32] as const;

/** templates defined as left halves (8 chars), mirrored to 16 */
const HALF: Record<Exclude<Tpl, "blank">, string[]> = {
  heart: ["........", "..kkk...", ".koook..", "kowooook", "kwoooooo", "kooooooo", ".koooooo", "..kooooo", "...koooo", "....kooo", ".....koo", "......ko", ".......k", "........", "........", "........"],
  mushroom: ["........", ".....kkk", "...kkooo", "..kooWWo", ".koooWWo", ".kWWoooo", "kWWWoooo", "kWWooooo", "kooooooo", ".kkkkkkk", "...keeee", "...kekee", "...keeee", "...keeee", "....kkkk", "........"],
  ghost: ["........", ".....kkk", "...kkvvv", "..kvvvvv", ".kvvvvvv", ".kvWWvvv", ".kvWkvvv", "kvvvvvvv", "kvvvvvvv", "kvvvvvvv", "kvvvvvvv", "kvvvvvvv", "kvvkkvvk", "kk.kk.kk", "........", "........"],
  smile: ["........", ".....kkk", "...kkyyy", "..kyyyyy", ".kyyyyyy", ".kyyykyy", "kyyyykyy", "kyyyyyyy", "kyyyyyyy", "kyykyyyy", ".kyykyyy", "..kyykkk", "...kkyyy", ".....kkk", "........", "........"],
  flower: ["........", "......kk", ".....kpp", "..kk.kpp", ".kppkkyy", ".kpppkyy", "..kppkyy", "...kkkkk", "......kg", "......kg", "..kk..kg", ".kglk.kg", "..kglkkg", "...kkkkg", "......kg", "nnnnnnnn"],
};

function templateGrid(tpl: Tpl, n: number): number[] {
  const g = new Array(n * n).fill(0);
  if (tpl === "blank") return g;
  const rows = HALF[tpl].map((h) => h + h.split("").reverse().join(""));
  const off = Math.floor((n - 16) / 2);
  rows.forEach((row, y) => row.split("").forEach((c, x) => { g[(y + off) * n + x + off] = CHAR[c] ?? 0; }));
  return g;
}

// compact share encoding: run-length, colors as letters a-p, counts as decimal prefix
function encode(n: number, px: number[]): string {
  let out = "";
  for (let i = 0; i < px.length;) {
    let j = i;
    while (j < px.length && px[j] === px[i] && j - i < 999) j++;
    const run = j - i;
    out += (run > 1 ? run : "") + String.fromCharCode(97 + px[i]);
    i = j;
  }
  return `${n}.${out}`;
}
function decode(s: string): { n: number; px: number[] } | null {
  const m = /^(16|24|32)\.([0-9a-p]+)$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const px: number[] = [];
  const re = /(\d*)([a-p])/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(m[2]))) {
    const c = r[2].charCodeAt(0) - 97;
    const k = r[1] ? Number(r[1]) : 1;
    for (let i = 0; i < k && px.length < n * n; i++) px.push(c);
  }
  if (px.length !== n * n) return null;
  return { n, px };
}
const MAX_LINK = 1800;

export default function PixelGardenToy({ surprise, params }: ToyProps) {
  const { t } = useI18n();
  const tt = t.toys["pixel-garden"];
  const toast = useToast();

  const initial = (() => {
    const shared = params.get("px");
    const d = shared ? decode(shared) : null;
    if (d) return d;
    const tpls: Tpl[] = ["heart", "mushroom", "ghost", "flower", "smile"];
    const tpl = surprise ? tpls[Math.floor(Math.random() * tpls.length)] : "mushroom";
    return { n: 16, px: templateGrid(tpl, 16) };
  })();

  const [n, setN] = useState<number>(initial.n);
  const [px, setPx] = useState<number[]>(initial.px);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(surprise ? 4 : 5);
  const [gridLines, setGridLines] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const undo = useRef<number[][]>([]);
  const redo = useRef<number[][]>([]);
  const [, force] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cell, setCell] = useState(20);
  const painting = useRef<{ last: number } | null>(null);
  const pxRef = useRef(px);
  pxRef.current = px;

  // integer cell size so the grid is never distorted
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const c = Math.max(4, Math.floor((Math.min(r.width, r.height) - 32) / n));
      setCell(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  // render
  useEffect(() => {
    const cv = canvasRef.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = cell * n;
    cv.width = size * dpr; cv.height = size * dpr;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // checkerboard for transparency
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = px[y * n + x];
      ctx.fillStyle = v ? PALETTE[v] : (x + y) % 2 ? "#ECE9DF" : "#F5F3EC";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    if (gridLines && cell >= 8) {
      ctx.strokeStyle = "rgba(25,25,25,0.12)"; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < n; i++) {
        ctx.moveTo(i * cell + 0.5, 0); ctx.lineTo(i * cell + 0.5, size);
        ctx.moveTo(0, i * cell + 0.5); ctx.lineTo(size, i * cell + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = "rgba(25,25,25,0.3)";
      ctx.beginPath(); ctx.moveTo(size / 2 + 0.5, 0); ctx.lineTo(size / 2 + 0.5, size); ctx.moveTo(0, size / 2 + 0.5); ctx.lineTo(size, size / 2 + 0.5); ctx.stroke();
    }
    if (cursor) {
      ctx.strokeStyle = "#3457FF"; ctx.lineWidth = 2;
      ctx.strokeRect(cursor.x * cell + 1, cursor.y * cell + 1, cell - 2, cell - 2);
    }
  }, [px, n, cell, gridLines, cursor]);

  const commit = useCallback((next: number[]) => {
    undo.current.push(pxRef.current);
    if (undo.current.length > 60) undo.current.shift();
    redo.current = [];
    setPx(next);
  }, []);

  const flood = (start: number, src: number[], c: number) => {
    const target = src[start];
    if (target === c) return src;
    const out = src.slice();
    const stack = [start];
    while (stack.length) {
      const i = stack.pop()!;
      if (out[i] !== target) continue;
      out[i] = c;
      const x = i % n, y = Math.floor(i / n);
      if (x > 0) stack.push(i - 1);
      if (x < n - 1) stack.push(i + 1);
      if (y > 0) stack.push(i - n);
      if (y < n - 1) stack.push(i + n);
    }
    return out;
  };

  const paintLine = (from: number, to: number, value: number) => {
    const next = pxRef.current.slice();
    let x0 = from % n, y0 = Math.floor(from / n);
    const x1 = to % n, y1 = Math.floor(to / n);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      next[y0 * n + x0] = value;
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    setPx(next);
  };

  const cellAt = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * n), y = Math.floor(((e.clientY - r.top) / r.height) * n);
    if (x < 0 || y < 0 || x >= n || y >= n) return -1;
    return y * n + x;
  };

  const apply = (i: number) => {
    if (tool === "fill") { commit(flood(i, pxRef.current, color)); blip(300, 0.1, "triangle"); return; }
    undo.current.push(pxRef.current);
    redo.current = [];
    painting.current = { last: i };
    paintLine(i, i, tool === "erase" ? 0 : color);
    blip(tool === "erase" ? 300 : 700 + (i % n) * 20, 0.03);
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = cellAt(e);
    if (i >= 0) apply(i);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!painting.current) return;
    const i = cellAt(e);
    if (i < 0 || i === painting.current.last) return;
    paintLine(painting.current.last, i, tool === "erase" ? 0 : color);
    painting.current.last = i;
  };
  const onUp = () => { painting.current = null; force((v) => v + 1); };

  const doUndo = () => {
    const prev = undo.current.pop();
    if (!prev) return;
    redo.current.push(pxRef.current);
    if (prev.length !== n * n) setN(Math.round(Math.sqrt(prev.length)));
    setPx(prev);
  };
  const doRedo = () => {
    const nx = redo.current.pop();
    if (!nx) return;
    undo.current.push(pxRef.current);
    if (nx.length !== n * n) setN(Math.round(Math.sqrt(nx.length)));
    setPx(nx);
  };

  const changeSize = (s: number) => {
    if (s === n) return;
    const next = new Array(s * s).fill(0);
    const off = Math.floor((s - n) / 2);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const nx = x + off, ny = y + off;
      if (nx >= 0 && ny >= 0 && nx < s && ny < s) next[ny * s + nx] = px[y * n + x];
    }
    undo.current.push(px); redo.current = [];
    setN(s); setPx(next); setCursor(null);
  };

  const loadTpl = (tpl: Tpl) => { commit(templateGrid(tpl, n)); blip(880, 0.08); };

  const clear = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); return; }
    commit(new Array(n * n).fill(0)); setConfirmClear(false);
  };

  const exportPng = () => {
    const scale = Math.ceil(512 / n);
    const c = document.createElement("canvas");
    c.width = c.height = n * scale;
    const ctx = c.getContext("2d")!;
    px.forEach((v, i) => { if (v) { ctx.fillStyle = PALETTE[v]; ctx.fillRect((i % n) * scale, Math.floor(i / n) * scale, scale, scale); } });
    if (downloadCanvas(c, "pixel-garden")) toast(t.common.exported);
  };

  const share = async () => {
    const code = encode(n, px);
    if (code.length > MAX_LINK) { toast(t.common.tooBig); return; }
    const url = toyUrl("pixel-garden", { px: code });
    window.history.replaceState(null, "", url);
    const ok = await copyText(url);
    toast(ok ? `${t.common.copied} (${code.length} chars)` : t.common.copyFail);
  };

  const reset = () => {
    undo.current = []; redo.current = [];
    setN(16); setPx(templateGrid("mushroom", 16)); setTool("draw"); setColor(5); setGridLines(true); setCursor(null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); return; }
    if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); doRedo(); return; }
    const c = cursor ?? { x: Math.floor(n / 2), y: Math.floor(n / 2) };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [mx, my] = moves[e.key];
      setCursor({ x: Math.max(0, Math.min(n - 1, c.x + mx)), y: Math.max(0, Math.min(n - 1, c.y + my)) });
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault(); setCursor(c); apply(c.y * n + c.x); painting.current = null;
    } else if (e.key === "d") setTool("draw");
    else if (e.key === "e") setTool("erase");
    else if (e.key === "f") setTool("fill");
  };

  const toolIcons = { draw: <Pencil size={14} />, erase: <Eraser size={14} />, fill: <PaintBucket size={14} /> };
  const filled = px.filter(Boolean).length;

  return (
    <ToyLayout
      stageClassName="bg-paper-2 paper-grain"
      stage={
        <div ref={wrapRef} className="flex h-full w-full items-center justify-center">
          <div className="relative border-2 border-ink hard-shadow">
            <canvas
              ref={canvasRef} tabIndex={0}
              aria-label={`${tt.title} ${n}×${n}. ${tt.long} Keyboard: arrows move, Space paints, D/E/F switch tools, Ctrl+Z undo.`}
              className={cn("block touch-none select-none", tool === "fill" ? "cursor-cell" : "cursor-crosshair")}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
              onKeyDown={onKey} onBlur={() => setCursor(null)}
            />
          </div>
          <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10.5px] uppercase tracking-wider text-ink/60">
            {n}×{n} · {filled} px · {tt.tools[tool]}
          </div>
        </div>
      }
      panel={
        <>
          <PanelSection title={t.common.controls}>
            <ControlGroup label="Tool">
              <div className="grid grid-cols-3 border-2 border-ink" role="radiogroup" aria-label="Tool">
                {(["draw", "erase", "fill"] as Tool[]).map((k, i) => (
                  <button key={k} type="button" role="radio" aria-checked={tool === k} onClick={() => setTool(k)}
                    className={cn("flex min-h-10 items-center justify-center gap-1.5 font-mono text-[11px] uppercase", i > 0 && "border-l-2 border-ink", tool === k ? "bg-ink text-lime" : "hover:bg-lime/50")}>
                    {toolIcons[k]} {tt.tools[k]}
                  </button>
                ))}
              </div>
            </ControlGroup>
            <ControlGroup label={tt.color}>
              <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label={tt.color}>
                {PALETTE.slice(1).map((c, i) => (
                  <button key={c} type="button" role="radio" aria-checked={color === i + 1} aria-label={c}
                    onClick={() => { setColor(i + 1); if (tool === "erase") setTool("draw"); }}
                    className={cn("aspect-square border-2 border-ink", color === i + 1 && "outline-2 outline-offset-1 outline-cobalt")}
                    style={{ background: c }} />
                ))}
              </div>
            </ControlGroup>
            <Segmented label={tt.grid} value={String(n)} onChange={(v) => changeSize(Number(v))} options={SIZES.map((s) => ({ value: String(s), label: `${s}²` }))} />
            <Toggle label={tt.gridLines} checked={gridLines} onChange={setGridLines} />
            <div className="grid grid-cols-2 gap-2">
              <Btn icon={<Undo2 size={14} />} onClick={doUndo} disabled={undo.current.length === 0}>{tt.undo}</Btn>
              <Btn icon={<Redo2 size={14} />} onClick={doRedo} disabled={redo.current.length === 0}>{tt.redo}</Btn>
            </div>
          </PanelSection>
          <PanelSection title={tt.templates}>
            <div className="grid grid-cols-3 gap-1.5">
              {(["blank", "heart", "mushroom", "ghost", "flower", "smile"] as Tpl[]).map((k) => (
                <button key={k} type="button" onClick={() => loadTpl(k)}
                  className="press border-2 border-ink bg-paper px-1 py-2 font-mono text-[10.5px] uppercase hover:bg-lav">{tt.tpl[k]}</button>
              ))}
            </div>
          </PanelSection>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="lime" icon={<Download size={14} />} onClick={exportPng}>{t.common.export}</Btn>
            <Btn icon={<Link2 size={14} />} onClick={share}>{t.common.copyLink}</Btn>
            <Btn variant={confirmClear ? "signal" : "paper"} icon={<Trash2 size={14} />} onClick={clear}>{confirmClear ? "✓ ?" : tt.clear}</Btn>
            <Btn variant="ink" icon={<RotateCcw size={14} />} onClick={reset}>{t.common.reset}</Btn>
          </div>
          {confirmClear && <p className="font-mono text-[11px] text-signal" role="alert">{tt.confirmClear}</p>}
          <p className="font-mono text-[10.5px] leading-relaxed text-ink/55">{t.common.shareNote}</p>
        </>
      }
    />
  );
}
