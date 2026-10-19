import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { EGG_IDS, type EggId } from "@/lib/storage";

export default function About({ open, onClose, eggs }: { open: boolean; onClose: () => void; eggs: EggId[] }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="about-h"
      className="m-auto w-[min(94vw,640px)] max-h-[88svh] overflow-y-auto border-2 border-ink bg-paper p-0 text-ink backdrop:bg-ink/60"
      style={{ boxShadow: "8px 8px 0 #D8FF3E" }}
    >
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-5 py-3 text-paper">
        <h2 id="about-h" className="font-mono text-[12px] uppercase tracking-[0.2em]">{t.about.title}</h2>
        <button type="button" onClick={onClose} aria-label={t.about.close} className="flex h-8 w-8 items-center justify-center border-2 border-paper hover:bg-lime hover:text-ink">
          <X size={16} />
        </button>
      </div>
      <div className="space-y-4 p-5 text-[15px] leading-relaxed sm:p-7">
        <p className="font-display text-3xl font-extrabold leading-none tracking-tight">INTERNET TOYBOX</p>
        <p>{t.about.p1}</p>
        <p>{t.about.p2}</p>
        <p>{t.about.p3}</p>
        <div className="border-2 border-dashed border-ink p-4">
          <p className="font-mono text-[12px] uppercase tracking-wider">{t.about.eggs(eggs.length, EGG_IDS.length)}</p>
          <div className="mt-2 flex gap-1.5" aria-hidden>
            {EGG_IDS.map((id) => (
              <span key={id} className={`h-5 w-4 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] border-2 border-ink ${eggs.includes(id) ? "bg-lime" : "bg-paper-2"}`} />
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-ink/60">{t.about.eggHint}</p>
        </div>
        <p className="font-serif text-xl italic text-ink/70">{t.about.madeBy}</p>
      </div>
    </dialog>
  );
}
