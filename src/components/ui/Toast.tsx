import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastFn = (msg: string) => void;
const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback<ToastFn>((text) => {
    window.clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = window.setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex justify-center px-4">
        {msg && (
          <div
            key={msg.id}
            className="toast-in w-full max-w-[460px] border-2 border-ink bg-ink px-4 py-3 font-mono text-[12px] leading-snug text-paper"
            style={{ boxShadow: "4px 4px 0 #D8FF3E" }}
          >
            <span className="mr-2 text-lime">●</span>
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
