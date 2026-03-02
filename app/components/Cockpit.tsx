import { useMemo } from "react";
import * as THREE from "three";

/*
 * 🛸 The Cockpit
 * ────────────────────────────────────────────
 * Every great view needs a frame.
 * And this frame says "I got here on purpose."
 *
 * Built from extruded shapes and a little imagination,
 * the cockpit wraps around the camera like a hug
 * from the cold indifference of aerospace engineering.
 *
 *    ┌──────────────────────────────┐
 *    │  ╔══════════════════════╗    │
 *    │  ║   THE VIEWPORT       ║    │
 *    │  ║   (you are here)     ║    │
 *    │  ╚══════════════════════╝    │
 *    │  ▓▓▓ CONSOLE PANEL ▓▓▓▓▓    │
 *    └──────────────────────────────┘
 */

export function Cockpit() {
  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1a2e",
        roughness: 0.4,
        metalness: 0.8,
      }),
    []
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0f3460",
        roughness: 0.3,
        metalness: 0.9,
        emissive: "#0a1628",
        emissiveIntensity: 0.3,
      }),
    []
  );

  const consoleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#16213e",
        roughness: 0.5,
        metalness: 0.7,
      }),
    []
  );

  return (
    <group>
      {/* ─── left wall ─── */}
      <mesh position={[-12, 0, -2]} material={panelMaterial}>
        <boxGeometry args={[1, 14, 20]} />
      </mesh>

      {/* ─── right wall ─── */}
      <mesh position={[12, 0, -2]} material={panelMaterial}>
        <boxGeometry args={[1, 14, 20]} />
      </mesh>

      {/* ─── ceiling ─── */}
      <mesh position={[0, 7, -2]} material={panelMaterial}>
        <boxGeometry args={[25, 1, 20]} />
      </mesh>

      {/* ─── floor ─── */}
      <mesh position={[0, -7, -2]} material={panelMaterial}>
        <boxGeometry args={[25, 1, 20]} />
      </mesh>

      {/* ─── viewport frame — top ─── */}
      <mesh position={[0, 5.5, -11]} material={trimMaterial}>
        <boxGeometry args={[22, 1.5, 1]} />
      </mesh>

      {/* ─── viewport frame — bottom ─── */}
      <mesh position={[0, -3.5, -11]} material={trimMaterial}>
        <boxGeometry args={[22, 1.5, 1]} />
      </mesh>

      {/* ─── viewport frame — left ─── */}
      <mesh position={[-10.5, 1, -11]} material={trimMaterial}>
        <boxGeometry args={[1.5, 10.5, 1]} />
      </mesh>

      {/* ─── viewport frame — right ─── */}
      <mesh position={[10.5, 1, -11]} material={trimMaterial}>
        <boxGeometry args={[1.5, 10.5, 1]} />
      </mesh>

      {/* ─── console / dashboard panel ─── */}
      <mesh
        position={[0, -4.5, -5]}
        rotation={[-0.4, 0, 0]}
        material={consoleMaterial}
      >
        <boxGeometry args={[20, 0.5, 8]} />
      </mesh>

      {/* ─── console detail strips — the blinky bits ─── */}
      {[-6, -2, 2, 6].map((x, i) => (
        <mesh
          key={i}
          position={[x, -4.2, -4]}
          rotation={[-0.4, 0, 0]}
        >
          <boxGeometry args={[1.5, 0.1, 2]} />
          <meshStandardMaterial
            color={["#e94560", "#00d2ff", "#0f3460", "#e94560"][i]}
            emissive={["#e94560", "#00d2ff", "#0f3460", "#e94560"][i]}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}

      {/* ─── small indicator lights on the frame ─── */}
      {[
        [-9, 5, -10.4],
        [9, 5, -10.4],
        [-9, -2.5, -10.4],
        [9, -2.5, -10.4],
      ].map(([x, y, z], i) => (
        <mesh key={`light-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#00ff88" : "#ff4444"}
            emissive={i % 2 === 0 ? "#00ff88" : "#ff4444"}
            emissiveIntensity={2}
          />
        </mesh>
      ))}

      {/* ─── back wall (behind the camera, seals the room) ─── */}
      <mesh position={[0, 0, 8]} material={panelMaterial}>
        <boxGeometry args={[25, 15, 1]} />
      </mesh>
    </group>
  );
}
