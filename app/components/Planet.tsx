import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateAllLODTextures } from "~/utils/planetTextures";
import {
  PLANET_LOCAL_POS,
  PLANET_RADIUS,
  getDistanceToSurface,
  computeGrandnessScale,
  getLODLevel,
  TERRAIN_APPEAR_DIST,
  TERRAIN_OPAQUE_DIST,
} from "~/utils/grandnessEffect";

/*
 * 🪐 The Planet
 * ────────────────────────────────────────────
 * Sitting there in the viewport like a marble
 * someone left on a black velvet cloth.
 *
 * She rotates slowly. She doesn't care about
 * your deadlines or your sprint retro.
 * She was here before you and she'll be here after.
 *
 * The atmosphere shader gives her that thin blue halo —
 * fragile, like everything worth protecting.
 *
 * ╭──────────────────────────────────────────╮
 * │  The Grandness Effect + Non-Euclidean    │
 * │                                          │
 * │  Fly toward her. She grows exponentially. │
 * │  Not perspective — actual scaling.        │
 * │  At 130 units she's a marble.            │
 * │  At 10 units she's a god.                │
 * │  At 5 units she's gone.                  │
 * │                                          │
 * │  That last one is the trick.             │
 * │  As the terrain plane fades IN,          │
 * │  the sphere fades OUT. Cross-dissolve.   │
 * │  Curved world → flat ground.             │
 * │  The non-Euclidean sleight of hand.      │
 * │                                          │
 * │  You never see the transition because    │
 * │  there IS no transition. Just two things │
 * │  trading places in the dark.             │
 * ╰──────────────────────────────────────────╯
 */

export function Planet({ shipWorldPosRef }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const planetRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const atmosphereRef = useRef<THREE.Mesh>(null!);

  // current LOD tracked imperatively — no re-renders in the frame loop
  const currentLOD = useRef(0);

  // 🎨 precompute all LOD textures on mount — 4 surface + 4 cloud
  // seeded PRNG keeps continents in the same spots across all tiers
  const textures = useMemo(() => generateAllLODTextures(), []);

  useFrame((_, delta) => {
    // ── The Grandness Effect ──
    // surface distance — not center distance, because 40 units of rock matters
    let scale = 1;
    if (shipWorldPosRef?.current) {
      const distance = getDistanceToSurface(shipWorldPosRef.current);

      // 📏 exponential scaling — she grows beyond what perspective alone would give
      scale = computeGrandnessScale(distance);
      groupRef.current.scale.setScalar(scale);

      /*
       * 🎯 Scale from the near surface, not the center
       * ──────────────────────────────────────────────
       * Without this, the scaled sphere rushes TOWARD the camera
       * and engulfs it. At scale=5× the visual radius is 200 units
       * but the center is only 90 units away — you're inside the planet,
       * looking at backfaces. She disappears. Poof. Not the vibe.
       *
       * The fix: push the center AWAY from the camera by R*(scale-1).
       * The near surface stays pinned at its real distance.
       * The far side balloons into infinity behind it.
       *
       * Result: approaching a real planet. She fills the viewport
       * like a wall of terrain. You see curvature flatten into
       * an endless horizon. Rivers appear. Mountains emerge.
       * But she never clips through your windshield.
       *
       *   Before:  center stays → near surface rushes through you
       *   After:   near surface stays → center retreats into the rock
       */
      if (scale > 1) {
        const dirToShip = shipWorldPosRef.current.clone()
          .sub(PLANET_LOCAL_POS)
          .normalize();
        const pushback = PLANET_RADIUS * (scale - 1);
        groupRef.current.position.set(
          PLANET_LOCAL_POS.x - dirToShip.x * pushback,
          PLANET_LOCAL_POS.y - dirToShip.y * pushback,
          PLANET_LOCAL_POS.z - dirToShip.z * pushback,
        );
      } else {
        groupRef.current.position.copy(PLANET_LOCAL_POS);
      }

      // 🔍 LOD swap — textures sharpen as you approach
      const newLOD = getLODLevel(distance);
      if (newLOD !== currentLOD.current) {
        currentLOD.current = newLOD;

        // imperative material swap — no React re-renders, just raw GPU joy
        const planetMat = planetRef.current
          .material as THREE.MeshStandardMaterial;
        const cloudMat = cloudsRef.current
          .material as THREE.MeshStandardMaterial;

        planetMat.map = textures.surface[newLOD];
        planetMat.bumpMap = textures.bump[newLOD];
        planetMat.bumpScale = newLOD >= 2 ? 2.5 : 0.8;
        planetMat.needsUpdate = true;
        cloudMat.map = textures.cloud[newLOD];
        cloudMat.needsUpdate = true;
      }

      /*
       * 🎭 The Non-Euclidean Cross-Fade
       * ──────────────────────────────────
       * This is where the magic happens.
       *
       * As the terrain plane fades in (d: 10→5),
       * the sphere fades out. When the terrain is fully
       * opaque, the sphere is invisible. You're looking
       * at a flat surface where a curved one used to be.
       *
       * The viewer never notices because:
       *   1. At 330× scale, the curvature is already 1/13,200
       *   2. The terrain is positioned exactly at the tangent point
       *   3. The cross-fade happens while you're busy
       *      fighting the Zeno field
       *
       * It's like the Theseus paradox but for geometry.
       * At what point did the sphere become a plane?
       * Answer: it didn't. You just stopped looking.
       *
       *   sphere opacity:  1.0 ████████░░░░ 0.0
       *   terrain opacity: 0.0 ░░░░████████ 1.0
       *                        d=10        d=5
       */
      if (distance < TERRAIN_APPEAR_DIST) {
        const fadeT = Math.max(
          0,
          Math.min(
            1,
            (TERRAIN_APPEAR_DIST - distance) /
              (TERRAIN_APPEAR_DIST - TERRAIN_OPAQUE_DIST)
          )
        );
        // sphere dissolves as terrain solidifies
        const sphereOpacity = 1 - fadeT;

        const planetMat = planetRef.current
          .material as THREE.MeshStandardMaterial;
        const cloudMat = cloudsRef.current
          .material as THREE.MeshStandardMaterial;
        const atmosMat = atmosphereRef.current
          .material as THREE.MeshBasicMaterial;

        planetMat.opacity = sphereOpacity;
        planetMat.transparent = true;
        planetMat.depthWrite = sphereOpacity > 0.5;

        cloudMat.opacity = 0.6 * sphereOpacity;
        atmosMat.opacity = 0.12 * sphereOpacity;

        // once fully faded, hide entirely — no ghost fragments
        groupRef.current.visible = sphereOpacity > 0.01;
      } else {
        // full opacity — she's a marble, she's proud
        const planetMat = planetRef.current
          .material as THREE.MeshStandardMaterial;
        const atmosMat = atmosphereRef.current
          .material as THREE.MeshBasicMaterial;

        planetMat.opacity = 1;
        planetMat.transparent = false;
        planetMat.depthWrite = true;

        const cloudMat = cloudsRef.current
          .material as THREE.MeshStandardMaterial;
        cloudMat.opacity = 0.6;
        atmosMat.opacity = 0.12;

        groupRef.current.visible = true;
      }
    }

    /*
     * 🌀 Rotation scales inversely with grandness
     * ────────────────────────────────────────────
     * A marble spins fast. A world barely moves.
     *
     * At scale=1 she's a marble — leisurely spin.
     * At scale=500 she's a world — the surface is still,
     * continents crawling at geological pace.
     * At scale=2000 you'd need a timelapse to notice.
     *
     * This is what sells the horizon. A spinning ball
     * screams "I'm a 3D model!" A still surface
     * whispers "you're actually here."
     */
    const rotSpeed = 1 / scale;
    planetRef.current.rotation.y += delta * 0.03 * rotSpeed;
    cloudsRef.current.rotation.y += delta * 0.04 * rotSpeed;
    atmosphereRef.current.rotation.y += delta * 0.01 * rotSpeed;
  });

  return (
    <group ref={groupRef} position={[PLANET_LOCAL_POS.x, PLANET_LOCAL_POS.y, PLANET_LOCAL_POS.z]}>
      {/* the planet herself — starts at LOD 0 (distant marble) */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[40, 64, 64]} />
        <meshStandardMaterial
          map={textures.surface[0]}
          bumpMap={textures.bump[0]}
          bumpScale={0.8}
          roughness={0.8}
        />
      </mesh>

      {/* cloud layer — slightly larger, slightly mysterious */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[40.3, 64, 64]} />
        <meshStandardMaterial
          map={textures.cloud[0]}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* atmosphere glow — the thin blue line */}
      <mesh ref={atmosphereRef} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[40, 64, 64]} />
        <meshBasicMaterial
          color="#4a90d9"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ─── Props at the bottom, as is tradition ─── */

interface PlanetProps {
  shipWorldPosRef?: React.RefObject<THREE.Vector3>;
}
