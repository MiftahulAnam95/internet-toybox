import { memo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TOYS, type ToySlug } from "@/lib/toys";
import { cn } from "@/utils/cn";
import { ToyPreview } from "./ToyPreviews";

/** Deliberately uneven editorial layout: each slot has its own span, orientation and type treatment. */
const LAYOUT: Record<ToySlug, { span: string; dir: "row" | "col"; preview: string; title: string }> = {
  gravity: { span: "md:col-span-7", dir: "row", preview: "h-48 md:h-auto md:w-[52%]", title: "text-4xl md:text-5xl" },
  "liquid-type": { span: "md:col-span-5", dir: "col", preview: "h-44", title: "text-3xl md:text-4xl" },
  "particle-orchestra": { span: "md:col-span-4", dir: "col", preview: "h-48", title: "text-3xl" },
  "button-lab": { span: "md:col-span-8", dir: "row", preview: "h-44 md:h-auto md:w-[46%]", title: "text-4xl md:text-5xl" },
  "pixel-garden": { span: "md:col-span-5", dir: "row", preview: "h-44 md:h-auto md:w-[45%]", title: "text-3xl" },
  "sound-of-nothing": { span: "md:col-span-7", dir: "col", preview: "h-40", title: "text-3xl md:text-4xl" },
};

function ToyGrid({ onOpen, plays }: { onOpen: (s: ToySlug) => void; plays: Partial<Record<ToySlug, number>> }) {
  const { t } = useI18n();
  return (
    <section id="toys" aria-labelledby="toys-h" className="border-b-2 border-ink">
      <div className="flex flex-col gap-1 border-b-2 border-ink px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <h2 id="toys-h" className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{t.grid.heading}</h2>
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-ink/60">{t.grid.count}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12">
        {TOYS.map((toy, idx) => {
          const L = LAYOUT[toy.slug];
          const tt = t.toys[toy.slug];
          const n = plays[toy.slug] ?? 0;
          const dark = toy.slug === "particle-orchestra" || toy.slug === "liquid-type";
          return (
            <article key={toy.slug} className={cn("border-b-2 border-ink md:[&:nth-child(1)]:border-r-2 md:[&:nth-child(3)]:border-r-2 md:[&:nth-child(5)]:border-r-2", L.span, idx >= 4 && "md:border-b-0")}>
              <button
                type="button"
                onClick={() => onOpen(toy.slug)}
                className={cn("group flex h-full w-full text-left outline-none", L.dir === "row" ? "flex-col md:flex-row" : "flex-col")}
                aria-label={`${toy.number} — ${tt.title}. ${tt.desc}`}
              >
                <div className={cn("relative shrink-0 overflow-hidden border-ink", L.preview, L.dir === "row" ? "border-b-2 md:border-b-0 md:border-r-2" : "border-b-2")}
                  style={{ background: toy.accent }}>
                  <ToyPreview slug={toy.slug} />
                  <span className="absolute left-3 top-3 font-mono text-[10.5px] font-semibold tracking-widest" style={{ color: toy.onAccent }}>
                    TOY {toy.number}
                  </span>
                </div>
                <div className="relative flex flex-1 flex-col gap-3 p-4 transition-colors group-hover:bg-paper-2 group-focus-visible:bg-lime/40 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[44px] font-semibold leading-none text-ink/12 transition-colors group-hover:text-ink" aria-hidden>{toy.number}</span>
                    <span className={cn("font-mono text-[10px] uppercase tracking-wider", n ? "text-ink" : "text-ink/40")}>
                      {n ? t.grid.plays(n) : t.grid.never}
                    </span>
                  </div>
                  <h3 className={cn("font-display font-extrabold leading-[0.95] tracking-tight", L.title)}>{tt.title}</h3>
                  <p className="max-w-[36ch] text-[15px] leading-snug text-ink/80">{tt.desc}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                    <span className="font-mono text-[10.5px] leading-snug text-ink/55">↳ {tt.hint}</span>
                    <span className={cn("inline-flex shrink-0 items-center gap-1 border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-semibold uppercase transition-all group-hover:-translate-y-0.5 group-hover:shadow-[3px_3px_0_#191919]", dark ? "bg-ink text-lime" : "bg-lime")}>
                      {t.grid.launch} <ArrowUpRight size={14} />
                    </span>
                  </div>
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
export default memo(ToyGrid);
