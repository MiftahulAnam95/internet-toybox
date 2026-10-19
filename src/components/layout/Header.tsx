import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { blip } from "@/lib/uiSound";
import { cn } from "@/utils/cn";

interface Props {
  uiSound: boolean;
  onToggleSound: () => void;
  onAbout: () => void;
  onHome: () => void;
  onEgg: (id: "status" | "wordmark") => void;
  compact?: boolean;
}

const WORD = "INTERNET TOYBOX";

export default function Header({ uiSound, onToggleSound, onAbout, onHome, onEgg, compact }: Props) {
  const { t, lang, setLang } = useI18n();
  const [hop, setHop] = useState<number[]>([]);
  const statusClicks = useRef(0);
  const wordClicks = useRef<number[]>([]);

  const tickle = (i: number) => {
    setHop((h) => [...h, i]);
    window.setTimeout(() => setHop((h) => h.filter((x) => x !== i)), 450);
    blip(400 + i * 40, 0.05, "triangle");
    const now = Date.now();
    wordClicks.current = [...wordClicks.current.filter((x) => now - x < 2500), now];
    if (wordClicks.current.length >= 6) { wordClicks.current = []; onEgg("wordmark"); }
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-[2px]">
      <div className="flex h-[56px] items-center gap-3 px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onHome} aria-label="INTERNET TOYBOX — home" className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink">
            <span className="block h-3 w-3 rounded-full bg-lime" />
            <span className="ml-0.5 block h-3 w-3 bg-signal" />
          </button>
          <div className={cn("font-display text-[17px] font-extrabold leading-none tracking-tight sm:text-[19px]", compact && "hidden sm:block")} aria-hidden>
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                onClick={() => tickle(i)}
                className="inline-block cursor-pointer select-none transition-transform duration-300"
                style={{ transform: hop.includes(i) ? `translateY(-7px) rotate(${i % 2 ? 12 : -12}deg)` : undefined, color: hop.includes(i) ? "#3457FF" : undefined }}
              >
                {ch === " " ? "\u00A0" : ch}
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => { statusClicks.current++; blip(300 + statusClicks.current * 90, 0.05); if (statusClicks.current === 7) onEgg("status"); }}
          className="ml-2 hidden items-center gap-2 border border-ink/30 px-2 py-1 font-mono text-[10px] tracking-[0.14em] md:flex"
          aria-label={t.header.status}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2BB673] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2BB673]" />
          </span>
          {t.header.status}
        </button>

        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2" aria-label="Site">
          <button type="button" onClick={onAbout} className="px-2 py-1 font-mono text-[11px] uppercase tracking-wider underline decoration-2 underline-offset-4 hover:bg-lime">
            {t.header.about}
          </button>
          <button
            type="button" onClick={onToggleSound} aria-pressed={uiSound}
            aria-label={uiSound ? t.header.soundOn : t.header.soundOff} title={uiSound ? t.header.soundOn : t.header.soundOff}
            className={cn("flex h-8 w-8 items-center justify-center border-2 border-ink", uiSound ? "bg-lime" : "bg-paper")}
          >
            {uiSound ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <div role="group" aria-label={t.header.lang} className="flex border-2 border-ink font-mono text-[11px] font-semibold">
            {(["en", "id"] as const).map((l) => (
              <button
                key={l} type="button" aria-pressed={lang === l}
                onClick={() => { setLang(l); blip(l === "en" ? 600 : 800); }}
                className={cn("h-7 w-9 uppercase", lang === l ? "bg-ink text-lime" : "hover:bg-lime/60")}
              >
                {l}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
