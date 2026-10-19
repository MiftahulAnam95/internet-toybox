import type { ToySlug } from "@/lib/toys";

/** Each preview is a tiny, purpose-built visual — they react to the parent `.group` hover/focus. */

function GravityPreview() {
  const items = [
    { x: 18, y: 72, c: "#3457FF", s: "circle" }, { x: 40, y: 78, c: "#FF6238", s: "square" }, { x: 62, y: 74, c: "#191919", s: "tri" },
    { x: 30, y: 52, c: "#F5F3EC", s: "square" }, { x: 52, y: 55, c: "#C8B8FF", s: "circle" }, { x: 78, y: 70, c: "#F5F3EC", s: "circle" },
  ];
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ink" />
      {items.map((it, i) => (
        <span key={i}
          className="absolute block border-2 border-ink transition-transform duration-500 ease-[cubic-bezier(.3,1.6,.5,1)] group-hover:-translate-y-[var(--j)] group-focus-visible:-translate-y-[var(--j)]"
          style={{
            left: `${it.x}%`, top: `${it.y - 20}%`, width: 38, height: 38, background: it.c,
            borderRadius: it.s === "circle" ? "50%" : 0,
            clipPath: it.s === "tri" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            ["--j" as string]: `${40 + i * 14}px`, transitionDelay: `${i * 40}ms`,
            rotate: `${(i * 23) % 40 - 20}deg`,
          }} />
      ))}
      <span className="absolute left-[70%] top-[18%] text-3xl transition-transform duration-700 group-hover:translate-y-24 group-hover:rotate-180">🦆</span>
    </div>
  );
}

function LiquidPreview() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <svg viewBox="0 0 300 140" className="h-full w-full" aria-hidden>
        <defs>
          <filter id="goo-prev">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="3">
              <animate attributeName="baseFrequency" dur="6s" values="0.012 0.03;0.02 0.05;0.012 0.03" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="18" />
          </filter>
        </defs>
        <text x="150" y="100" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="800" fontSize="104" fill="#F5F3EC" filter="url(#goo-prev)" letterSpacing="-4">
          Blob
        </text>
      </svg>
    </div>
  );
}

function ParticlePreview() {
  const dots = Array.from({ length: 140 }, (_, i) => {
    const a = i * 0.5, r = 4 + i * 0.42;
    return { x: 50 + Math.cos(a) * r * 0.9, y: 50 + Math.sin(a) * r * 0.55, c: ["#D8FF3E", "#3457FF", "#FF6238", "#C8B8FF"][i % 4], s: 1 + (i % 3) };
  });
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <g className="origin-center transition-transform duration-[1600ms] ease-out group-hover:rotate-[160deg] group-hover:scale-125" style={{ transformBox: "fill-box" }}>
        {dots.map((d, i) => <rect key={i} x={d.x} y={d.y} width={d.s * 0.7} height={d.s * 0.7} fill={d.c} />)}
      </g>
    </svg>
  );
}

function ButtonPreview() {
  return (
    <div className="relative flex h-full w-full flex-col items-start justify-center gap-2 overflow-hidden pl-[12%]">
      {["OK", "CANCEL", "MAYBE?"].map((l, i) => (
        <span key={l}
          className="border-2 border-ink bg-paper px-3 py-1 font-mono text-[11px] font-semibold shadow-[3px_3px_0_#191919] transition-transform duration-300"
          style={{ rotate: `${(i - 1) * 4}deg` }}>
          {l}
        </span>
      ))}
      <span className="absolute right-[12%] top-[38%] border-2 border-ink bg-lime px-3 py-1 font-mono text-[11px] font-semibold shadow-[3px_3px_0_#191919] transition-all duration-300 group-hover:translate-x-[140%] group-hover:-rotate-12">
        CLICK ME
      </span>
    </div>
  );
}

const HEART = ["..XX.XX..", ".XooXooX.", "XoWoooooX", "XoooooooX", ".XoooooX.", "..XoooX..", "...XoX...", "....X...."];
function PixelPreview() {
  const colors: Record<string, string> = { X: "#191919", o: "#FF6238", W: "#F5F3EC", ".": "transparent" };
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="grid gap-[2px] transition-transform duration-300 group-hover:scale-110" style={{ gridTemplateColumns: "repeat(9, 14px)" }}>
        {HEART.join("").split("").map((c, i) => (
          <span key={i} className="block h-[14px] w-[14px]" style={{ background: colors[c], outline: c === "." ? "1px dashed rgba(25,25,25,0.15)" : undefined }} />
        ))}
      </div>
    </div>
  );
}

function SoundPreview() {
  const on = new Set([0, 5, 10, 13, 18, 23, 27, 33, 36, 41, 46, 50, 55, 60, 63]);
  return (
    <div className="relative flex h-full w-full items-center justify-center px-6">
      <div className="relative grid w-full gap-[3px]" style={{ gridTemplateColumns: "repeat(16, 1fr)" }}>
        {Array.from({ length: 64 }, (_, i) => (
          <span key={i} className="block aspect-square border border-ink/25" style={{ background: on.has(i) ? ["#FF6238", "#D8FF3E", "#3457FF", "#C8B8FF"][Math.floor(i / 16)] : undefined, borderColor: on.has(i) ? "#191919" : undefined }} />
        ))}
        <span className="sound-playhead pointer-events-none absolute -inset-y-1 left-0 w-[6.25%] border-2 border-ink bg-ink/10" />
      </div>
      <style>{`
        @keyframes playhead { from { left: 0 } to { left: 93.75% } }
        .sound-playhead { animation: playhead 2.4s steps(16) infinite; animation-play-state: paused; }
        .group:hover .sound-playhead, .group:focus-visible .sound-playhead { animation-play-state: running; }
      `}</style>
    </div>
  );
}

export function ToyPreview({ slug }: { slug: ToySlug }) {
  switch (slug) {
    case "gravity": return <GravityPreview />;
    case "liquid-type": return <LiquidPreview />;
    case "particle-orchestra": return <ParticlePreview />;
    case "button-lab": return <ButtonPreview />;
    case "pixel-garden": return <PixelPreview />;
    case "sound-of-nothing": return <SoundPreview />;
  }
}
