import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface ToyProps {
  /** true when opened via "Surprise me" — toys should start in a randomized, lively state */
  surprise: boolean;
  /** query params, used to restore shared compositions */
  params: URLSearchParams;
}

export function ToyLayout({
  stage, panel, stageClassName, footer,
}: { stage: ReactNode; panel: ReactNode; stageClassName?: string; footer?: ReactNode }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col border-b-2 border-ink lg:border-b-0 lg:border-r-2">
        <div className={cn("relative h-[62svh] min-h-[320px] w-full overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1", stageClassName)}>
          {stage}
        </div>
        {footer}
      </div>
      <aside className="flex flex-col gap-4 bg-paper p-4 pb-24 lg:min-h-0 lg:overflow-y-auto lg:pb-6">
        {panel}
      </aside>
    </div>
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink">
        <span className="h-[2px] w-3 bg-ink" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function StageReadout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute left-3 top-3 select-none font-mono text-[10.5px] uppercase tracking-wider", className)}>
      {children}
    </div>
  );
}
