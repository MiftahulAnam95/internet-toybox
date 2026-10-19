import { useCallback, useEffect, useRef, useState } from "react";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { TOYS, isToySlug, type ToySlug } from "@/lib/toys";
import { storage, type EggId } from "@/lib/storage";
import { blip, setUiSoundEnabled } from "@/lib/uiSound";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import Header from "@/components/layout/Header";
import Home from "@/components/layout/Home";
import About from "@/components/layout/About";
import ToyShell from "@/components/toys/ToyShell";

interface Route {
  slug: ToySlug | null;
  surprise: boolean;
  params: URLSearchParams;
  instance: number;
}

function readRoute(instance = 0): Route {
  const params = new URLSearchParams(window.location.search);
  const s = params.get("toy");
  return { slug: isToySlug(s) ? s : null, surprise: false, params, instance };
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const MAGIC = "toybox";

function Playground() {
  const { t } = useI18n();
  const toast = useToast();
  const [route, setRoute] = useState<Route>(() => readRoute());
  const [recent, setRecent] = useState(() => storage.getRecent());
  const [plays, setPlays] = useState(() => storage.getPlays());
  const [eggs, setEggs] = useState<EggId[]>(() => storage.getEggs());
  const [uiSound, setUiSound] = useState(() => storage.getUiSound());
  const [about, setAbout] = useState(false);
  const [party, setParty] = useState(false);
  const counted = useRef<string>("");

  useEffect(() => { setUiSoundEnabled(uiSound); storage.setUiSound(uiSound); }, [uiSound]);

  // record a play whenever a toy opens (once per open)
  useEffect(() => {
    if (!route.slug) return;
    const key = route.slug + ":" + route.instance;
    if (counted.current === key) return;
    counted.current = key;
    storage.recordPlay(route.slug);
    setRecent(storage.getRecent());
    setPlays(storage.getPlays());
  }, [route.slug, route.instance]);

  useEffect(() => {
    const onPop = () => setRoute((r) => readRoute(r.instance + 1));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback((slug: ToySlug, surprise = false) => {
    const u = new URL(window.location.href);
    u.search = ""; u.hash = "";
    u.searchParams.set("toy", slug);
    window.history.pushState(null, "", u.toString());
    setRoute((r) => ({ slug, surprise, params: new URLSearchParams(u.search), instance: r.instance + 1 }));
    window.scrollTo({ top: 0 });
  }, []);

  const goHome = useCallback(() => {
    const u = new URL(window.location.href);
    u.search = "";
    window.history.pushState(null, "", u.pathname);
    setRoute((r) => ({ slug: null, surprise: false, params: new URLSearchParams(), instance: r.instance + 1 }));
    requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  }, []);

  const surprise = useCallback(() => {
    const pool = TOYS.filter((x) => x.slug !== route.slug);
    open(pool[Math.floor(Math.random() * pool.length)].slug, true);
  }, [open, route.slug]);

  const findEgg = useCallback((id: EggId) => {
    const isNew = storage.addEgg(id);
    if (isNew) setEggs(storage.getEggs());
    toast((isNew ? "🥚 " : "") + t.eggs[id]);
    blip(1046, 0.12, "triangle"); setTimeout(() => blip(1318, 0.16, "triangle"), 110);
  }, [t, toast]);

  // keyboard easter eggs
  useEffect(() => {
    let seq: string[] = [];
    let typed = "";
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      seq = [...seq, k].slice(-KONAMI.length);
      if (seq.join() === KONAMI.join()) {
        seq = [];
        document.documentElement.classList.toggle("secret-mode");
        findEgg("konami");
      }
      if (e.key.length === 1) {
        typed = (typed + e.key.toLowerCase()).slice(-MAGIC.length);
        if (typed === MAGIC) { typed = ""; setParty((p) => !p); findEgg("typed"); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [findEgg]);

  useEffect(() => {
    console.log("%cINTERNET TOYBOX%c\nCurious, huh? Try typing \"toybox\" on the homepage, or an old cheat code. ↑↑↓↓←→←→BA", "background:#D8FF3E;color:#191919;font:800 18px sans-serif;padding:4px 8px", "font:12px monospace");
  }, []);

  return (
    <div className="min-h-svh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:bg-lime focus:p-2 focus:font-mono focus:text-sm">Skip to content</a>
      <Header
        uiSound={uiSound}
        onToggleSound={() => setUiSound((v) => !v)}
        onAbout={() => setAbout(true)}
        onHome={goHome}
        onEgg={findEgg}
        compact={!!route.slug}
      />
      {route.slug ? (
        <ToyShell
          slug={route.slug}
          surprise={route.surprise}
          params={route.params}
          instance={route.instance}
          onBack={goHome}
          onOpen={(s) => open(s)}
          onSurprise={surprise}
        />
      ) : (
        <>
          <Home
            onOpen={(s) => open(s)}
            onSurprise={surprise}
            onShake={() => { if (!storage.getEggs().includes("shake")) findEgg("shake"); }}
            onClearHistory={() => { storage.clearHistory(); setRecent([]); setPlays({}); }}
            recent={recent}
            plays={plays}
            party={party}
          />
          <footer className="grid grid-cols-1 gap-4 px-4 py-8 sm:px-6 md:grid-cols-12">
            <p className="font-display text-3xl font-extrabold leading-none tracking-tight md:col-span-7 md:text-5xl">{t.footer.line}</p>
            <div className="flex flex-col justify-end gap-2 font-mono text-[11px] uppercase tracking-wider text-ink/60 md:col-span-5 md:items-end">
              <span>● {t.footer.built}</span>
              <button type="button" onClick={() => setAbout(true)} className="w-fit underline decoration-2 underline-offset-4 hover:bg-lime">{t.header.about}</button>
              <span>© {new Date().getFullYear()} INTERNET TOYBOX</span>
            </div>
          </footer>
        </>
      )}
      <About open={about} onClose={() => setAbout(false)} eggs={eggs} />
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Playground />
      </ToastProvider>
    </I18nProvider>
  );
}
