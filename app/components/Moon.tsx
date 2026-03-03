import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🌙 The Moon
 * ────────────────────────────────────────────
 * Every planet needs a sidekick.
 * Someone to pull the tides, catch the blame
 * for werewolves, and look good in photographs.
 *
 * She orbits patiently — not because she has to,
 * but because she forgot where else to go.
 *
 * We parked the ship between her orbit and the planet,
 * right in that cozy Goldilocks lane where the tides
 * tug gently instead of ripping the hull apart.
 * Orbital mechanics: it's just vibes with math.
 *
 * The directional light paints half of her silver
 * and leaves the other half to imagination.
 * Just like every good relationship.
 *
 *       .  *  .
 *     .    🌕    .
 *       .  *  .
 */

export function Moon() {
  const ref = useRef<THREE.Group>(null!);

  // 🎠 orbit radius 200 — the ship sits at ~128 units from the planet,
  //    so we're safely inside her path, watching her drift by overhead
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.08;
    const orbitRadius = 200;
    ref.current.position.set(
      Math.cos(t) * orbitRadius,
      Math.sin(t * 0.3) * 12,
      Math.sin(t) * orbitRadius
    );
  });

  return (
    <group position={[30, 5, -120]}>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial
            color="#b0b0b0"
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
      </group>
    </group>
  );
}
