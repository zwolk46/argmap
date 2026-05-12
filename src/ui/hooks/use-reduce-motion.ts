import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  React.useEffect(() => {
    const mq = window.matchMedia(QUERY);
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
