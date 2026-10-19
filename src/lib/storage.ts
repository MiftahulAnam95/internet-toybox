import type { Lang } from "./i18n";
import type { ToySlug } from "./toys";

const KEY = "itb:v1:";

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY + k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(KEY + k, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode) — fail silently */
  }
}

export interface RecentEntry {
  slug: ToySlug;
  at: number;
}

export const EGG_IDS = ["konami", "status", "wordmark", "shake", "typed"] as const;
export type EggId = (typeof EGG_IDS)[number];

export const storage = {
  getLang(): Lang {
    const l = read<string>("lang", "");
    if (l === "en" || l === "id") return l;
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("id")) return "id";
    return "en";
  },
  setLang(l: Lang) {
    write("lang", l);
  },
  getRecent(): RecentEntry[] {
    return read<RecentEntry[]>("recent", []);
  },
  getPlays(): Partial<Record<ToySlug, number>> {
    return read<Partial<Record<ToySlug, number>>>("plays", {});
  },
  recordPlay(slug: ToySlug) {
    const recent = this.getRecent().filter((r) => r.slug !== slug);
    recent.unshift({ slug, at: Date.now() });
    write("recent", recent.slice(0, 6));
    const plays = this.getPlays();
    plays[slug] = (plays[slug] ?? 0) + 1;
    write("plays", plays);
  },
  clearHistory() {
    write("recent", []);
    write("plays", {});
  },
  getEggs(): EggId[] {
    return read<EggId[]>("eggs", []);
  },
  addEgg(id: EggId): boolean {
    const eggs = this.getEggs();
    if (eggs.includes(id)) return false;
    eggs.push(id);
    write("eggs", eggs);
    return true;
  },
  getSeenHints(): string[] {
    return read<string[]>("hints", []);
  },
  markHint(slug: string) {
    const h = this.getSeenHints();
    if (!h.includes(slug)) write("hints", [...h, slug]);
  },
  getUiSound(): boolean {
    return read<boolean>("uisound", false);
  },
  setUiSound(v: boolean) {
    write("uisound", v);
  },
};
