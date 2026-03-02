import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🛸 The Cockpit v2 — Now With Walls That Work
 * ────────────────────────────────────────────
 * First rule of spacecraft design:
 * if you can see space through the floor,
 * you've made a convertible, not a cockpit.
 *
 * This revision seals the cabin properly and adds
 * the kind of ambient lighting that says
 * "yes, we have a budget" and also "we've seen Alien."
 *
 *    ┌──────────────────────────────────┐
 *    │ ░░░░░ CEILING LED STRIP ░░░░░░  │
 *    │  ╔════════════════════════╗      │
 *    │  ║    THE VIEWPORT        ║  ◈   │
 *    │  ║    (still here)        ║      │
 *    │  ╚════════════════════════╝      │
 *    │  ████ SOLID BULKHEAD █████████   │
 *    │  ▓▓▓▓ CONSOLE PANEL ▓▓▓▓▓▓▓▓   │
 *    │ ░░░░░ FLOOR LED STRIPS ░░░░░░░  │
 *    └──────────────────────────────────┘
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
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  STRUCTURAL — the bones of this tin can
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

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

      {/* ─── floor — solid, flat, no peeking at the void ─── */}
      <mesh position={[0, -5.5, -2]} material={panelMaterial}>
        <boxGeometry args={[25, 1, 20]} />
      </mesh>

      {/* ─── back wall (behind the camera, seals the room) ─── */}
      <mesh position={[0, 0, 8]} material={panelMaterial}>
        <boxGeometry args={[25, 13.5, 1]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  FRONT WALL — the viewport and bulkhead
       *  (you can't see space through the floor anymore,
       *   which is generally considered a safety feature)
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─── front wall / bulkhead BELOW the viewport ─── */}
      <mesh position={[0, -4.25, -11]} material={panelMaterial}>
        <boxGeometry args={[25, 3.5, 1]} />
      </mesh>

      {/* ─── front wall ABOVE the viewport ─── */}
      <mesh position={[0, 6.25, -11]} material={panelMaterial}>
        <boxGeometry args={[25, 2.5, 1]} />
      </mesh>

      {/* ─── front wall LEFT of viewport ─── */}
      <mesh position={[-11.25, 1, -11]} material={panelMaterial}>
        <boxGeometry args={[2.5, 8, 1]} />
      </mesh>

      {/* ─── front wall RIGHT of viewport ─── */}
      <mesh position={[11.25, 1, -11]} material={panelMaterial}>
        <boxGeometry args={[2.5, 8, 1]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  VIEWPORT FRAME — the money shot framing
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─── viewport frame — top ─── */}
      <mesh position={[0, 4.5, -11.1]} material={trimMaterial}>
        <boxGeometry args={[20, 0.6, 0.3]} />
      </mesh>

      {/* ─── viewport frame — bottom ─── */}
      <mesh position={[0, -2, -11.1]} material={trimMaterial}>
        <boxGeometry args={[20, 0.6, 0.3]} />
      </mesh>

      {/* ─── viewport frame — left ─── */}
      <mesh position={[-9.5, 1.25, -11.1]} material={trimMaterial}>
        <boxGeometry args={[0.6, 7.1, 0.3]} />
      </mesh>

      {/* ─── viewport frame — right ─── */}
      <mesh position={[9.5, 1.25, -11.1]} material={trimMaterial}>
        <boxGeometry args={[0.6, 7.1, 0.3]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  CONSOLE — the dashboard of dreams
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─── console / dashboard panel ─── */}
      <mesh
        position={[0, -3.8, -6]}
        rotation={[-0.35, 0, 0]}
        material={consoleMaterial}
      >
        <boxGeometry args={[20, 0.4, 7]} />
      </mesh>

      {/* ─── console detail strips — the blinky bits ─── */}
      {[-6, -2, 2, 6].map((x, i) => (
        <mesh
          key={i}
          position={[x, -3.55, -5]}
          rotation={[-0.35, 0, 0]}
        >
          <boxGeometry args={[1.5, 0.1, 2]} />
          <meshStandardMaterial
            color={["#e94560", "#00d2ff", "#0f3460", "#e94560"][i]}
            emissive={["#e94560", "#00d2ff", "#0f3460", "#e94560"][i]}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* ─── small indicator lights on the viewport frame ─── */}
      {[
        [-9, 4.2, -10.8],
        [9, 4.2, -10.8],
        [-9, -1.7, -10.8],
        [9, -1.7, -10.8],
      ].map(([x, y, z], i) => (
        <mesh key={`ind-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#00ff88" : "#ff4444"}
            emissive={i % 2 === 0 ? "#00ff88" : "#ff4444"}
            emissiveIntensity={2}
          />
        </mesh>
      ))}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  LIGHTING — the vibe department
       *
       *  "Any sufficiently advanced spacecraft
       *   is indistinguishable from a nightclub."
       *       — Arthur C. Clarke (paraphrased)
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─── ceiling LED strips — two rails running front to back ─── */}
      <CeilingStrip x={-5} />
      <CeilingStrip x={5} />

      {/* ─── floor LED strips — subtle runway lighting ─── */}
      <FloorStrip x={-8} />
      <FloorStrip x={8} />

      {/* ─── wall accent panels — soft glow recesses ─── */}
      <WallPanel side="left" z={-6} />
      <WallPanel side="left" z={0} />
      <WallPanel side="left" z={5} />
      <WallPanel side="right" z={-6} />
      <WallPanel side="right" z={0} />
      <WallPanel side="right" z={5} />

      {/* ─── viewport glow trim — thin light around the window ─── */}
      <ViewportGlow />

      {/* ─── overhead spot accents — subtle pools of light on the floor ─── */}
      <pointLight position={[-5, 6.2, -2]} intensity={0.6} color="#1a3a5c" distance={10} decay={2} />
      <pointLight position={[5, 6.2, -2]} intensity={0.6} color="#1a3a5c" distance={10} decay={2} />

      {/* ─── console uplighting ─── */}
      <pointLight position={[0, -3, -5]} intensity={0.5} color="#00d2ff" distance={6} decay={2} />
      <pointLight position={[-5, -3, -5]} intensity={0.3} color="#e94560" distance={5} decay={2} />
      <pointLight position={[5, -3, -5]} intensity={0.3} color="#e94560" distance={5} decay={2} />
    </group>
  );
}

/*
 * 💡 Ceiling LED Strip
 * Runs front-to-back along the ceiling.
 * The kind of lighting that makes you feel like
 * you're in a spaceship OR a very expensive bathroom.
 */
function CeilingStrip({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  // gentle pulse — breathing, not strobing
  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.8 + Math.sin(clock.elapsedTime * 0.8) * 0.2;
    }
  });

  return (
    <mesh ref={ref} position={[x, 6.4, -2]}>
      <boxGeometry args={[0.15, 0.08, 18]} />
      <meshStandardMaterial
        color="#4a90d9"
        emissive="#4a90d9"
        emissiveIntensity={1}
        toneMapped={false}
      />
    </mesh>
  );
}

/*
 * 💡 Floor LED Strip
 * Runway lights, but for your boots.
 * Individual segments with gaps — because continuous
 * lighting is for hallways, not spacecraft.
 */
function FloorStrip({ x }: { x: number }) {
  const segments = 9;
  const segLen = 1.5;
  const gap = 0.5;
  const startZ = -10;

  return (
    <group>
      {Array.from({ length: segments }).map((_, i) => (
        <mesh
          key={i}
          position={[x, -4.95, startZ + i * (segLen + gap) + segLen / 2]}
        >
          <boxGeometry args={[0.3, 0.05, segLen]} />
          <meshStandardMaterial
            color="#00d2ff"
            emissive="#00d2ff"
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* actual light to cast glow on nearby surfaces */}
      <pointLight
        position={[x, -4.5, -2]}
        intensity={0.3}
        color="#00d2ff"
        distance={4}
        decay={2}
      />
    </group>
  );
}

/*
 * 💡 Wall Accent Panel
 * Recessed glowing rectangles on the side walls.
 * They serve no functional purpose. They look cool.
 * In space, that IS the functional purpose.
 */
function WallPanel({ side, z }: { side: "left" | "right"; z: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const x = side === "left" ? -11.4 : 11.4;
  const offset = side === "left" ? 0 : Math.PI; // phase offset so they don't all pulse together

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        0.4 + Math.sin(clock.elapsedTime * 0.5 + offset + z * 0.3) * 0.15;
    }
  });

  return (
    <group>
      {/* backing recess — darker than the wall */}
      <mesh position={[x, 1, z]}>
        <boxGeometry args={[0.05, 3, 2.5]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.9} metalness={0.5} />
      </mesh>
      {/* the glowing panel itself */}
      <mesh
        ref={ref}
        position={[side === "left" ? -11.35 : 11.35, 1, z]}
      >
        <boxGeometry args={[0.05, 2.4, 1.8]} />
        <meshStandardMaterial
          color="#0f3460"
          emissive="#1a5276"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      {/* light source for the panel */}
      <pointLight
        position={[side === "left" ? -10.5 : 10.5, 1, z]}
        intensity={0.2}
        color="#1a5276"
        distance={5}
        decay={2}
      />
    </group>
  );
}

/*
 * 💡 Viewport Glow
 * A thin light border around the viewport opening.
 * The universe is out there and this trim says
 * "look at it. LOOK AT IT."
 */
function ViewportGlow() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity =
            1.0 + Math.sin(clock.elapsedTime * 1.2) * 0.3;
        }
      });
    }
  });

  return (
    <group ref={ref}>
      {/* top glow */}
      <mesh position={[0, 4.15, -10.95]}>
        <boxGeometry args={[19, 0.08, 0.08]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
      {/* bottom glow */}
      <mesh position={[0, -1.65, -10.95]}>
        <boxGeometry args={[19, 0.08, 0.08]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
      {/* left glow */}
      <mesh position={[-9.15, 1.25, -10.95]}>
        <boxGeometry args={[0.08, 5.9, 0.08]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
      {/* right glow */}
      <mesh position={[9.15, 1.25, -10.95]}>
        <boxGeometry args={[0.08, 5.9, 0.08]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
