import { useState } from "react";
import { ArrowDown, Dices, History } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TOYS, getToy, type ToySlug } from "@/lib/toys";
import type { RecentEntry } from "@/lib/storage";
import { blip } from "@/lib/uiSound";
import HeroField from "./HeroField";
import ToyGrid from "./ToyGrid";

interface Props {
  onOpen: (s: ToySlug) => void;
  onSurprise: () => void;
  onShake: () => void;
  onClearHistory: () => void;
  recent: RecentEntry[];
  plays: Partial<Record<ToySlug, number>>;
  party: boolean;
}

function timeAgo(ts: number, lang: string) {
  const s = Math.round((Date.now() - ts) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (s < 60) return rtf.format(-s, "second");
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
}

export default function Home({ onOpen, onSurprise, onShake, onClearHistory, recent, plays, party }: Props) {
  const { t, lang } = useI18n();
  const [ptr, setPtr] = useState({ x: 0, y: 0, inside: false });
  const [calm, setCalm] = useState(false);
  const total = Object.values(plays).reduce((a, b) => a + (b ?? 0), 0);

  const shake = () => {
    setCalm(true);
    window.setTimeout(() => setCalm(false), 2200);
    onShake();
  };

  const marquee = lang === "id"
    ? ["Sentuh-sentuh aja", "Nggak ada skor", "Nggak ada login", "Bikin berantakan", "Klik semuanya", "Rahasia tersembunyi"]
    : ["Touch everything", "No high scores", "No sign-up", "Make a mess", "Click it anyway", "Secrets hidden inside"];

  return (
    <main id="main">
      {/* HERO */}
      <section className="relative grid min-h-[calc(100svh-58px)] grid-cols-1 border-b-2 border-ink lg:grid-cols-12" aria-labelledby="hero-h">
        <div className="relative z-10 flex flex-col justify-between gap-8 border-b-2 border-ink p-4 sm:p-6 lg:col-span-5 lg:border-b-0 lg:border-r-2 lg:p-8">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink/60">
            <span className="h-[2px] w-6 bg-ink" /> Vol.01 — {TOYS.length} toys
          </div>
          <div>
            <h1 id="hero-h" className="font-display text-[clamp(2.8rem,9vw,6.4rem)] font-extrabold leading-[0.86] tracking-[-0.04em] lg:text-[clamp(3.2rem,6.2vw,6.6rem)]">
              {t.hero.titleA}
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">{t.hero.titleB}</span>
                <span className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.32em] -skew-x-6 bg-lime" aria-hidden />
              </span>
            </h1>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-ink/80">{t.hero.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => { blip(880, 0.1, "triangle"); onSurprise(); }}
                className="press hard-shadow group inline-flex items-center gap-2 border-2 border-ink bg-signal px-5 py-3 font-mono text-[13px] font-semibold uppercase tracking-wide">
                <Dices size={18} className="transition-transform duration-500 group-hover:rotate-[200deg]" />
                {t.hero.surprise}
              </button>
              <a href="#toys" className="press inline-flex items-center gap-2 border-2 border-ink bg-paper px-5 py-3 font-mono text-[13px] font-semibold uppercase tracking-wide hover:bg-lime">
                {t.hero.pick} <ArrowDown size={16} />
              </a>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 border-t-2 border-ink pt-4 font-mono text-[10.5px] uppercase tracking-wider">
            <div><dt className="text-ink/50">Toys</dt><dd className="mt-1 text-lg font-semibold text-ink">06</dd></div>
            <div><dt className="text-ink/50">Accounts</dt><dd className="mt-1 text-lg font-semibold text-ink">00</dd></div>
            <div><dt className="text-ink/50">{lang === "id" ? "Sesi lu" : "Your plays"}</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{String(total).padStart(2, "0")}</dd></div>
          </dl>
        </div>

        <div className="relative min-h-[52svh] overflow-hidden paper-grain lg:col-span-7 lg:min-h-0">
          <HeroField label={t.hero.fieldLabel} party={party} onPointer={setPtr} onShake={shake} />
          <div className="pointer-events-none absolute left-4 top-4 font-mono text-[10.5px] uppercase tracking-wider">
            <div className="inline-flex items-center gap-2 bg-ink px-2 py-1 text-paper">
              <span className={ptr.inside ? "text-lime" : "blink text-signal"}>●</span>
              {calm ? t.hero.calm : ptr.inside ? t.hero.cursorIn : t.hero.cursorOut}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 text-right font-mono text-[10.5px] uppercase tabular-nums tracking-wider text-ink/70">
            <div>X {String(Math.round(ptr.x)).padStart(4, "0")} · Y {String(Math.round(ptr.y)).padStart(4, "0")}</div>
            <div className="mt-1 text-ink/50">{t.hero.tapHint}</div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="overflow-hidden border-b-2 border-ink bg-ink py-2.5 text-paper" aria-hidden>
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.2em]">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((m, i) => (
            <span key={i} className="flex items-center gap-10">{m}<span className={["text-lime", "text-signal", "text-lav", "text-cobalt"][i % 4]}>✦</span></span>
          ))}
        </div>
      </div>

      <ToyGrid onOpen={onOpen} plays={plays} />

      {/* RECENT */}
      <section aria-labelledby="recent-h" className="grid grid-cols-1 border-b-2 border-ink md:grid-cols-12">
        <div className="border-b-2 border-ink p-4 sm:p-6 md:col-span-4 md:border-b-0 md:border-r-2">
          <h2 id="recent-h" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight"><History size={20} /> {t.recent.title}</h2>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink/60">{t.recent.note}</p>
          {total > 0 && <p className="mt-3 font-mono text-[11px] uppercase">{t.recent.total(total)}</p>}
          {recent.length > 0 && (
            <button type="button" onClick={onClearHistory} className="mt-4 font-mono text-[11px] uppercase underline decoration-2 underline-offset-4 hover:bg-lime">{t.recent.clear}</button>
          )}
        </div>
        <div className="p-4 sm:p-6 md:col-span-8">
          {recent.length === 0 ? (
            <p className="font-serif text-2xl italic text-ink/60">{t.recent.empty}</p>
          ) : (
            <ol className="flex flex-wrap gap-2">
              {recent.map((r) => {
                const toy = getToy(r.slug);
                return (
                  <li key={r.slug}>
                    <button type="button" onClick={() => onOpen(r.slug)}
                      className="press hard-shadow-sm flex items-center gap-3 border-2 border-ink bg-paper py-1.5 pl-1.5 pr-3 text-left hover:bg-paper-2">
                      <span className="flex h-9 w-9 items-center justify-center border-2 border-ink font-mono text-[12px] font-semibold" style={{ background: toy.accent, color: toy.onAccent }}>{toy.number}</span>
                      <span>
                        <span className="block font-display text-[15px] font-bold leading-tight">{t.toys[r.slug].title}</span>
                        <span className="block font-mono text-[10px] uppercase text-ink/55">{timeAgo(r.at, lang)} · {plays[r.slug] ?? 0}×</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
