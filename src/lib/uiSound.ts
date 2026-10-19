/** Tiny UI blips — only plays when the user has enabled UI sound (off by default). */
let ctx: AudioContext | null = null;
let enabled = false;

export function setUiSoundEnabled(v: boolean) {
  enabled = v;
  if (v) getCtx()?.resume().catch(() => {});
}

export function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

export function blip(freq = 660, dur = 0.06, type: OscillatorType = "square", vol = 0.04) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
