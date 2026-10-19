import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, CircleHelp, Dices, Link2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TOYS, getToy, toyUrl, type ToySlug } from "@/lib/toys";
import { storage } from "@/lib/storage";
import { copyText } from "@/lib/export";
import { blip } from "@/lib/uiSound";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/utils/cn";
import type { ToyProps } from "./ToyLayout";

const TOY_COMPONENTS: Record<ToySlug, React.LazyExoticComponent<(p: ToyProps) => ReactNode>> = {
  gravity: lazy(() => import("./GravityToy")),
  "liquid-type": lazy(() => import("./LiquidTypeToy")),
  "particle-orchestra": lazy(() => import("./ParticleToy")),
  "button-lab": lazy(() => import("./ButtonLabToy")),
  "pixel-garden": lazy(() => import("./PixelGardenToy")),
  "sound-of-nothing": lazy(() => import("./SoundToy")),
};

class ToyErrorBoundary extends Component<{ children: ReactNode; onBack: () => void }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <p className="font-display text-4xl font-extrabold">This toy broke. Ironically.</p>
          <p className="font-mono text-[12px] text-ink/60">Your browser may not support a feature it needs.</p>
          <button type="button" onClick={this.props.onBack} className="border-2 border-ink bg-lime px-4 py-2 font-mono text-[12px] uppercase">← Back</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-10" role="status">
      <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-widest">
        <span className="blink inline-block h-4 w-4 bg-ink" /> booting toy…
      </div>
    </div>
  );
}

interface Props {
  slug: ToySlug;
  surprise: boolean;
  params: URLSearchParams;
  instance: number;
  onBack: () => void;
  onOpen: (s: ToySlug) => void;
  onSurprise: () => void;
}

export default function ToyShell({ slug, surprise, params, instance, onBack, onOpen, onSurprise }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const toy = getToy(slug);
  const tt = t.toys[slug];
  const Toy = TOY_COMPONENTS[slug];
  const idx = TOYS.findIndex((x) => x.slug === slug);
  const prev = TOYS[(idx + TOYS.length - 1) % TOYS.length];
  const next = TOYS[(idx + 1) % TOYS.length];
  const [hint, setHint] = useState(() => !storage.getSeenHints().includes(slug));

  useEffect(() => { setHint(!storage.getSeenHints().includes(slug)); }, [slug]);
  useEffect(() => {
    document.title = `${toy.number} ${tt.title} — INTERNET TOYBOX`;
    return () => { document.title = "INTERNET TOYBOX — The internet is your toy"; };
  }, [toy.number, tt.title]);

  // Escape returns to the playground (unless typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Escape" && tag !== "TEXTAREA" && tag !== "INPUT" && !document.querySelector("dialog[open]")) onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const dismissHint = () => { setHint(false); storage.markHint(slug); };
  const copy = async () => {
    const url = window.location.search.includes("toy=") ? window.location.href : toyUrl(slug);
    toast((await copyText(url)) ? t.common.copied : t.common.copyFail);
  };

  return (
    <div className="flex min-h-[calc(100svh-58px)] flex-col lg:h-[calc(100svh-58px)] lg:min-h-0">
      {/* toy bar */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink px-3 py-2 sm:px-4">
        <button type="button" onClick={onBack} className="press inline-flex min-h-9 items-center gap-1.5 border-2 border-ink bg-paper px-3 font-mono text-[11px] font-semibold uppercase hover:bg-lime">
          <ArrowLeft size={14} /> <span className="hidden sm:inline">{t.common.back}</span>
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 items-center border-2 border-ink px-2 font-mono text-[12px] font-semibold" style={{ background: toy.accent, color: toy.onAccent }}>{toy.number}</span>
          <h1 className="truncate font-display text-lg font-extrabold leading-none tracking-tight sm:text-2xl">{tt.title}</h1>
        </div>

        <nav aria-label={t.common.toyNav} className="order-last flex w-full items-center gap-1 overflow-x-auto no-scrollbar md:order-none md:ml-auto md:w-auto">
          <button type="button" onClick={() => onOpen(prev.slug)} aria-label={t.common.prev} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink hover:bg-lime"><ChevronLeft size={16} /></button>
          {TOYS.map((x) => (
            <button key={x.slug} type="button" onClick={() => { blip(500 + Number(x.number) * 60); onOpen(x.slug); }}
              aria-current={x.slug === slug ? "page" : undefined}
              title={t.toys[x.slug].title}
              className={cn("h-9 min-w-9 shrink-0 border-2 border-ink px-2 font-mono text-[11px] font-semibold transition-colors", x.slug === slug ? "bg-ink text-lime" : "hover:bg-paper-2")}>
              {x.number}
            </button>
          ))}
          <button type="button" onClick={() => onOpen(next.slug)} aria-label={t.common.next} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink hover:bg-lime"><ChevronRight size={16} /></button>
          <span className="mx-1 h-6 w-[2px] shrink-0 bg-ink/20" />
          <button type="button" onClick={onSurprise} aria-label={t.hero.surprise} title={t.hero.surprise} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-signal hover:-rotate-6"><Dices size={16} /></button>
          <button type="button" onClick={() => setHint(true)} aria-label={t.common.hint} title={t.common.hint} className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink hover:bg-lav"><CircleHelp size={16} /></button>
          <button type="button" onClick={copy} className="flex h-9 shrink-0 items-center gap-1.5 border-2 border-ink px-2.5 font-mono text-[11px] font-semibold uppercase hover:bg-lime"><Link2 size={14} /> <span className="hidden lg:inline">{t.common.copyLink}</span></button>
        </nav>
      </div>

      {/* description strip */}
      <div className="flex items-center gap-3 border-b-2 border-ink bg-paper-2 px-3 py-1.5 sm:px-4">
        <p className="truncate font-mono text-[11px] text-ink/70">{tt.desc}</p>
        <span className="ml-auto hidden shrink-0 font-mono text-[10.5px] uppercase text-ink/50 sm:block">↳ {tt.hint}</span>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <ToyErrorBoundary onBack={onBack} key={slug + instance}>
          <Suspense fallback={<Loading />}>
            <Toy key={slug + instance} surprise={surprise} params={params} />
          </Suspense>
        </ToyErrorBoundary>

        {hint && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3 lg:right-[330px]">
            <div role="dialog" aria-label={t.common.hint} className="pop-in pointer-events-auto flex max-w-md items-start gap-3 border-2 border-ink bg-lime p-3 hard-shadow">
              <span className="mt-0.5 font-mono text-[11px] font-semibold">{toy.number}</span>
              <div className="flex-1">
                <p className="text-[14px] leading-snug">{tt.long}</p>
                <button type="button" onClick={dismissHint} autoFocus className="mt-2 border-2 border-ink bg-ink px-3 py-1 font-mono text-[11px] font-semibold uppercase text-lime">{t.common.gotIt}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
