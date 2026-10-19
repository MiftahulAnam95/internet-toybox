import { useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Crude device capability guess to scale down effects. */
export function isLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency || 4;
  const small = window.innerWidth < 640;
  return cores <= 4 || small;
}

/** Keep latest value in a ref — for animation loops reading React state without re-subscribing. */
export function useLatest<T>(value: T) {
  const r = useRef(value);
  r.current = value;
  return r;
}
