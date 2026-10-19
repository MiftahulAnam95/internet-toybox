export const TOY_SLUGS = [
  "gravity",
  "liquid-type",
  "particle-orchestra",
  "button-lab",
  "pixel-garden",
  "sound-of-nothing",
] as const;

export type ToySlug = (typeof TOY_SLUGS)[number];

export interface ToyMeta {
  slug: ToySlug;
  number: string;
  /** accent used for the toy's visual identity */
  accent: string;
  /** ink to place on top of accent */
  onAccent: string;
  kind: "physics" | "type" | "generative" | "ui" | "drawing" | "audio";
}

export const TOYS: ToyMeta[] = [
  { slug: "gravity", number: "01", accent: "#D8FF3E", onAccent: "#191919", kind: "physics" },
  { slug: "liquid-type", number: "02", accent: "#3457FF", onAccent: "#F5F3EC", kind: "type" },
  { slug: "particle-orchestra", number: "03", accent: "#191919", onAccent: "#D8FF3E", kind: "generative" },
  { slug: "button-lab", number: "04", accent: "#FF6238", onAccent: "#191919", kind: "ui" },
  { slug: "pixel-garden", number: "05", accent: "#C8B8FF", onAccent: "#191919", kind: "drawing" },
  { slug: "sound-of-nothing", number: "06", accent: "#F5F3EC", onAccent: "#191919", kind: "audio" },
];

export function isToySlug(s: string | null): s is ToySlug {
  return !!s && (TOY_SLUGS as readonly string[]).includes(s);
}

export function getToy(slug: ToySlug): ToyMeta {
  return TOYS.find((t) => t.slug === slug)!;
}

export function toyUrl(slug: ToySlug, extra?: Record<string, string>): string {
  const u = new URL(window.location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("toy", slug);
  if (extra) for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.toString();
}
