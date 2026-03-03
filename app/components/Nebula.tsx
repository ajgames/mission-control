import { useMemo } from "react";
import * as THREE from "three";

/*
 * 🌌 The Nebula
 * ────────────────────────────────────────────
 * A giant inverted sphere that wraps the entire scene
 * in a subtle blue-purple gradient. Without it, space
 * is pure black — which is technically accurate but
 * emotionally bankrupt.
 *
 * The Gemini station logs note that their viewport
 * filters added a "cosmic wash" to the view outside.
 * The crew believed it was artistic license.
 * The engineers knew it was a rendering trick.
 * Both were right.
 *
 *     ╭─────────────────────╮
 *     │  ·  ★  ·  ·  ★  ·  │
 *     │ ·  ░░░░░░░░░░░ · · │
 *     │   ░░ deep purple ░░ │
 *     │ · ░░░░░░░░░░░░░░ · │
 *     │  ·  · ★ ·  ·  ★  · │
 *     ╰─────────────────────╯
 *       (you are here, inside)
 */

export function Nebula() {
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#0a0818",
      side: THREE.BackSide,
    });
  }, []);

  return (
    <group>
      {/* main sky sphere — deep purple-black backdrop */}
      <mesh material={material}>
        <sphereGeometry args={[1800, 32, 32]} />
      </mesh>

      {/* nebula wisps — semi-transparent colored clouds at different distances */}
      <NebulaCloud
        position={[-400, 100, -800]}
        scale={[300, 150, 1]}
        color="#1a0a3a"
        opacity={0.15}
      />
      <NebulaCloud
        position={[300, -50, -600]}
        scale={[250, 200, 1]}
        color="#0a1a3a"
        opacity={0.12}
      />
      <NebulaCloud
        position={[-200, 200, -500]}
        scale={[350, 180, 1]}
        color="#1a0a2e"
        opacity={0.1}
      />
      <NebulaCloud
        position={[100, -150, -900]}
        scale={[400, 250, 1]}
        color="#0a0a2a"
        opacity={0.18}
      />
    </group>
  );
}

function NebulaCloud({
  position,
  scale,
  color,
  opacity,
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
