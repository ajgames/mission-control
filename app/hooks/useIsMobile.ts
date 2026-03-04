import { useState, useEffect } from "react";

/*
 * 📱 useIsMobile
 * ────────────────────────────────────────────
 * Are we on a phone? A tablet? A smart fridge?
 *
 * We check `(pointer: coarse)` because fingers
 * are fat and mice are precise. That's the REAL
 * difference between "mobile" and "desktop" —
 * the size of your pointing device.
 *
 * No pointer lock on phones. No WASD on glass.
 * But there IS determination and two thumbs.
 */

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setIsMobile(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
