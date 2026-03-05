import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

/*
 * 💓 usePulse — the heartbeat of every glowing thing
 * ────────────────────────────────────────────────────
 * Light bars, console screens, viewport glow — they all
 * breathe. Not in sync (that's creepy), but each with
 * its own rhythm. This hook gives them that rhythm.
 *
 * Returns a ref whose `.current` is the pulsing value,
 * updated every frame. No React state. No re-renders.
 * Just pure, imperative, 60fps vibes.
 *
 *   const pulse = usePulse(0.6, z * 0.3, 1.0, 0.25);
 *   // pulse.current oscillates: 0.75 ↔ 1.25
 */
export function usePulse(
  speed: number,
  phase: number,
  base: number,
  amplitude: number
) {
  const elapsed = useRef(0);
  const value = useRef(base);

  useFrame((_, delta) => {
    elapsed.current += delta;
    value.current = base + Math.sin(elapsed.current * speed + phase) * amplitude;
  });

  return value;
}
