import { useEffect } from "react";

/**
 * Keeps the guess dock above the on-screen keyboard: writes the keyboard overlap (px) to the
 * `--kb-inset` custom property on <html> using the VisualViewport API.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        root.style.setProperty("--kb-inset", `${Math.round(inset)}px`);
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb-inset");
    };
  }, []);
}
