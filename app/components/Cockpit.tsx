import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🛸 The Cockpit v3 — Gemini Configuration
 * ─────────────────────────────────────────
 * We found the Gemini station blueprints in a smuggler's
 * data cache near Tau Ceti. The lighting alone was worth
 * the detour — cyan chevrons cut across the deck plates,
 * light bars line the ceiling like luminous ribs, and
 * console pedestals stand at attention like a choir of ghosts.
 *
 * If v2 whispered "we've seen Alien,"
 * v3 says "we were in the director's chair."
 *
 *    ┌────────────────────────────────────┐
 *    │ ═══ CEILING LIGHT BARS ══════════ │
 *    │  ┃ ╔══════════════════════╗  ┃   │
 *    │  ┃ ║                      ║  ┃   │
 *    │  ┃ ║    THE VIEWPORT      ║  ┃   │
 *    │  ┃ ║                      ║  ┃   │
 *    │  ┃ ╚══════════════════════╝  ┃   │
 *    │  ┃   ▐▌  ▐▌  ▐▌  ▐▌  ▐▌    ┃   │
 *    │  ┃     CONSOLE PEDESTALS     ┃   │
 *    │  ╲══════╱╲══════╱╲══════╱        │
 *    │     FLOOR CHEVRONS               │
 *    └────────────────────────────────────┘
 */

export function Cockpit() {
  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a2045",
        roughness: 0.7,
        metalness: 0.3,
        emissive: "#1a1535",
        emissiveIntensity: 0.15,
      }),
    []
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3d2d6b",
        roughness: 0.4,
        metalness: 0.5,
        emissive: "#1a1248",
        emissiveIntensity: 0.3,
      }),
    []
  );

  return (
    <group>
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  STRUCTURAL — same bones, new soul
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

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

      {/* ─── floor — solid, no peeking at the void ─── */}
      <mesh position={[0, -5.5, -2]} material={panelMaterial}>
        <boxGeometry args={[25, 1, 20]} />
      </mesh>

      {/* ─── back wall ─── */}
      <mesh position={[0, 0, 8]} material={panelMaterial}>
        <boxGeometry args={[25, 13.5, 1]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  WALL PANELING — because flat walls are for warehouses
       *
       *  The Gemini blueprints call these "articulated bulkheads"
       *  which is just fancy talk for "walls designed by someone
       *  who understood that shadow IS texture." Raised ledges,
       *  vertical pilasters, ceiling ribs — each seam catches
       *  the light differently and whispers "this was built,
       *  not spawned."
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      <WallPaneling side="left" trimMaterial={trimMaterial} />
      <WallPaneling side="right" trimMaterial={trimMaterial} />
      <CeilingPaneling trimMaterial={trimMaterial} />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  FRONT WALL — viewport and bulkhead
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      <mesh position={[0, -4.25, -11]} material={panelMaterial}>
        <boxGeometry args={[25, 3.5, 1]} />
      </mesh>
      <mesh position={[0, 6.25, -11]} material={panelMaterial}>
        <boxGeometry args={[25, 2.5, 1]} />
      </mesh>
      <mesh position={[-11.25, 1, -11]} material={panelMaterial}>
        <boxGeometry args={[2.5, 8, 1]} />
      </mesh>
      <mesh position={[11.25, 1, -11]} material={panelMaterial}>
        <boxGeometry args={[2.5, 8, 1]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  VIEWPORT FRAME — the money shot framing
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      <mesh position={[0, 4.5, -11.1]} material={trimMaterial}>
        <boxGeometry args={[20, 0.6, 0.3]} />
      </mesh>
      <mesh position={[0, -2, -11.1]} material={trimMaterial}>
        <boxGeometry args={[20, 0.6, 0.3]} />
      </mesh>
      <mesh position={[-9.5, 1.25, -11.1]} material={trimMaterial}>
        <boxGeometry args={[0.6, 7.1, 0.3]} />
      </mesh>
      <mesh position={[9.5, 1.25, -11.1]} material={trimMaterial}>
        <boxGeometry args={[0.6, 7.1, 0.3]} />
      </mesh>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  LIGHTING — Gemini configuration
       *
       *  The Gemini station crew logs describe their
       *  lighting philosophy as "aggressive serenity."
       *  Nobody knows what that means. Everyone agrees
       *  it looks absolutely incredible.
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ─── ceiling light bars — wide ribs across the top ─── */}
      <CeilingLightBar z={-8} />
      <CeilingLightBar z={-2} />
      <CeilingLightBar z={4} />

      {/* ─── wall light bars — horizontal cyan shelves ─── */}
      <WallLightBar side="left" z={-7} />
      <WallLightBar side="left" z={-1} />
      <WallLightBar side="left" z={5} />
      <WallLightBar side="right" z={-7} />
      <WallLightBar side="right" z={-1} />
      <WallLightBar side="right" z={5} />

      {/* ─── floor chevrons — V-lines converging to the viewport ─── */}
      <FloorChevrons />

      {/* ─── console pedestals — the bridge crew's workstations ─── */}
      <ConsolePedestals />

      {/* ─── viewport glow — the universe wants your attention ─── */}
      <ViewportGlow />

      {/* ─── viewport corner indicators — unified cyan ─── */}
      {[
        [-9, 4.2, -10.8],
        [9, 4.2, -10.8],
        [-9, -1.7, -10.8],
        [9, -1.7, -10.8],
      ].map(([x, y, z], i) => (
        <mesh key={`ind-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#00ffcc"
            emissive="#00ffcc"
            emissiveIntensity={2}
          />
        </mesh>
      ))}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  FILL LIGHTS — the invisible hands of atmosphere
       *
       *  Point lights don't render themselves, they just
       *  make everything else look better. The unsung
       *  lighting engineers of the universe.
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}

      {/* ceiling wash — bathes the upper cabin in blue-purple */}
      <pointLight position={[-6, 5.5, -2]} intensity={1.5} color="#4a3a8a" distance={16} decay={2} />
      <pointLight position={[6, 5.5, -2]} intensity={1.5} color="#4a3a8a" distance={16} decay={2} />
      <pointLight position={[0, 5.5, -8]} intensity={1.0} color="#00a8cc" distance={14} decay={2} />

      {/* floor wash — cyan glow from below */}
      <pointLight position={[0, -4, -4]} intensity={0.8} color="#00d2ff" distance={12} decay={2} />
      <pointLight position={[0, -4, 3]} intensity={0.6} color="#00d2ff" distance={10} decay={2} />

      {/* wall wash — purple fill to reveal the side walls */}
      <pointLight position={[-9, 1, -2]} intensity={1.2} color="#3a2a7a" distance={14} decay={2} />
      <pointLight position={[9, 1, -2]} intensity={1.2} color="#3a2a7a" distance={14} decay={2} />

      {/* pedestal area — warm up the console zone */}
      <pointLight position={[-3, -2, -5]} intensity={0.6} color="#00d2ff" distance={8} decay={2} />
      <pointLight position={[3, -2, -5]} intensity={0.6} color="#00d2ff" distance={8} decay={2} />

      {/* viewport spill — light leaking in from the cosmos */}
      <pointLight position={[0, 1, -10]} intensity={0.8} color="#88ccff" distance={12} decay={2} />

      {/* back wall fill — so the rear doesn't vanish */}
      <pointLight position={[0, 1, 6]} intensity={0.8} color="#3a2a7a" distance={10} decay={2} />
    </group>
  );
}

/*
 * 🧱 Wall Paneling
 * ──────────────────
 * Horizontal ledges and vertical pilasters on each side wall.
 * The raised geometry catches light at different angles,
 * turning a flat slab into something that reads as
 * "engineered" instead of "extruded."
 *
 * Pro tip from the Gemini construction logs:
 * "If you can't afford rivets, fake them with trim."
 */
function WallPaneling({
  side,
  trimMaterial,
}: {
  side: "left" | "right";
  trimMaterial: THREE.MeshStandardMaterial;
}) {
  const x = side === "left" ? -11.35 : 11.35;

  return (
    <group>
      {/* ─── horizontal ledges — shadow lines across the wall ─── */}
      {[3.2, -1.5].map((y, i) => (
        <mesh key={`h-${i}`} position={[x, y, -2]} material={trimMaterial}>
          <boxGeometry args={[0.25, 0.2, 18.5]} />
        </mesh>
      ))}

      {/* ─── vertical pilasters — panel dividers ─── */}
      {[-6, 0, 5.5].map((z, i) => (
        <mesh key={`v-${i}`} position={[x, 1, z]} material={trimMaterial}>
          <boxGeometry args={[0.25, 10, 0.25]} />
        </mesh>
      ))}

      {/* ─── wall-ceiling cove — beveled transition strip ─── */}
      <mesh
        position={[
          side === "left" ? -11.0 : 11.0,
          6.1,
          -2,
        ]}
        rotation={[0, 0, side === "left" ? -0.7 : 0.7]}
        material={trimMaterial}
      >
        <boxGeometry args={[1.2, 0.2, 18.5]} />
      </mesh>

      {/* ─── wall-floor cove — lower transition strip ─── */}
      <mesh
        position={[
          side === "left" ? -11.0 : 11.0,
          -4.7,
          -2,
        ]}
        rotation={[0, 0, side === "left" ? 0.5 : -0.5]}
        material={trimMaterial}
      >
        <boxGeometry args={[1.0, 0.15, 18.5]} />
      </mesh>
    </group>
  );
}

/*
 * 🧱 Ceiling Paneling
 * ─────────────────────
 * Cross beams and a center ridge on the ceiling.
 * The kind of structural honesty that says
 * "these beams hold up the ceiling" even though
 * in zero-g they absolutely do not.
 */
function CeilingPaneling({
  trimMaterial,
}: {
  trimMaterial: THREE.MeshStandardMaterial;
}) {
  return (
    <group>
      {/* ─── center ridge — the spine of the ceiling ─── */}
      <mesh position={[0, 6.4, -2]} material={trimMaterial}>
        <boxGeometry args={[0.3, 0.25, 18.5]} />
      </mesh>

      {/* ─── cross beams — ribs across the ceiling ─── */}
      {[-7, -1, 5].map((z, i) => (
        <mesh key={`cb-${i}`} position={[0, 6.4, z]} material={trimMaterial}>
          <boxGeometry args={[22, 0.2, 0.3]} />
        </mesh>
      ))}
    </group>
  );
}

/*
 * 💡 Ceiling Light Bar
 * ───────────────────────
 * Wide horizontal bars at the ceiling-wall junction.
 * Two per row — one left, one right — like the ribs
 * of some enormous bioluminescent whale.
 * The Gemini engineers loved bilateral symmetry.
 * We love it too.
 */
function CeilingLightBar({ z }: { z: number }) {
  const leftRef = useRef<THREE.Mesh>(null!);
  const rightRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.6 + z * 0.3;
    const intensity = 1.0 + Math.sin(t) * 0.25;
    for (const ref of [leftRef, rightRef]) {
      if (ref.current) {
        (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
          intensity;
      }
    }
  });

  return (
    <group>
      <mesh ref={leftRef} position={[-7.5, 6.35, z]}>
        <boxGeometry args={[8, 0.15, 1.2]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={1.0}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={rightRef} position={[7.5, 6.35, z]}>
        <boxGeometry args={[8, 0.15, 1.2]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={1.0}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[-6, 5.5, z]}
        intensity={1.0}
        color="#00d2ff"
        distance={10}
        decay={2}
      />
      <pointLight
        position={[6, 5.5, z]}
        intensity={1.0}
        color="#00d2ff"
        distance={10}
        decay={2}
      />
    </group>
  );
}

/*
 * 💡 Wall Light Bar
 * ───────────────────
 * Horizontal light shelves mounted high on the walls.
 * They sit in dark recesses — little windows into
 * the ship's nervous system, glowing with purpose.
 *
 * Each bar pulses slightly out of phase with its
 * neighbors, because synchronized breathing is
 * only for yoga classes, not warships.
 */
function WallLightBar({ side, z }: { side: "left" | "right"; z: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const x = side === "left" ? -11.4 : 11.4;
  const glowX = side === "left" ? -11.35 : 11.35;
  const offset = side === "left" ? 0 : Math.PI;

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        0.8 + Math.sin(clock.elapsedTime * 0.4 + offset + z * 0.5) * 0.2;
    }
  });

  return (
    <group>
      {/* backing recess — darker than the wall */}
      <mesh position={[x, 4.5, z]}>
        <boxGeometry args={[0.08, 0.8, 3.0]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.9} metalness={0.5} />
      </mesh>
      {/* the light bar itself */}
      <mesh ref={ref} position={[glowX, 4.5, z]}>
        <boxGeometry args={[0.06, 0.5, 2.4]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        position={[side === "left" ? -10 : 10, 4.5, z]}
        intensity={0.8}
        color="#00d2ff"
        distance={8}
        decay={2}
      />
    </group>
  );
}

/*
 * 💡 Floor Chevrons
 * ──────────────────
 * V-shaped light lines etched into the deck plating,
 * converging toward the viewport like arrows pointing
 * at infinity. Plus edge runners along the walls
 * and a center spine — because even the floor
 * deserves to know which way is forward.
 *
 *       ╲        ╱
 *        ╲══════╱
 *         ╲    ╱
 *          ╲══╱
 *           ╲╱  ← viewport that way
 */
function FloorChevrons() {
  const chevrons = [
    { z: -6, halfWidth: 9, depth: 2.5 },
    { z: -3, halfWidth: 8, depth: 2.2 },
    { z: 0, halfWidth: 7, depth: 2.0 },
    { z: 3, halfWidth: 6, depth: 1.8 },
    { z: 5.5, halfWidth: 5, depth: 1.5 },
  ];

  return (
    <group>
      {chevrons.map((c, i) => (
        <ChevronLine key={i} {...c} />
      ))}

      {/* ─── edge runners along the floor edges ─── */}
      <mesh position={[-10.5, -4.95, -2]}>
        <boxGeometry args={[0.12, 0.06, 16]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[10.5, -4.95, -2]}>
        <boxGeometry args={[0.12, 0.06, 16]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* ─── center spine — the keel line ─── */}
      <mesh position={[0, -4.95, -4]}>
        <boxGeometry args={[0.1, 0.06, 12]} />
        <meshStandardMaterial
          color="#00ffdd"
          emissive="#00ffdd"
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function ChevronLine({
  z,
  halfWidth,
  depth,
}: {
  z: number;
  halfWidth: number;
  depth: number;
}) {
  /*
   * Each chevron arm is a thin box rotated to form a V.
   * Left arm:  (-halfWidth, y, z+depth)  →  (0, y, z)
   * Right arm: ( halfWidth, y, z+depth)  →  (0, y, z)
   * The tip points toward the viewport (-z direction).
   */
  const armLength = Math.sqrt(halfWidth * halfWidth + depth * depth);
  const y = -4.95;
  const leftAngle = Math.atan2(halfWidth, -depth);
  const rightAngle = Math.atan2(-halfWidth, -depth);

  return (
    <group>
      <mesh
        position={[-halfWidth / 2, y, z + depth / 2]}
        rotation={[0, leftAngle, 0]}
      >
        <boxGeometry args={[0.1, 0.06, armLength]} />
        <meshStandardMaterial
          color="#00ffdd"
          emissive="#00ffdd"
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[halfWidth / 2, y, z + depth / 2]}
        rotation={[0, rightAngle, 0]}
      >
        <boxGeometry args={[0.1, 0.06, armLength]} />
        <meshStandardMaterial
          color="#00ffdd"
          emissive="#00ffdd"
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/*
 * 🖥️ Console Pedestals
 * ──────────────────────
 * Six monoliths in a crescent, each one a standing
 * workstation with a glowing face. In the Gemini
 * blueprints these are called "interface pylons."
 * The crew called them "the choir."
 *
 * They don't sing. They do look like they might
 * start at any moment.
 */
function ConsolePedestals() {
  const positions = [
    { x: -7, z: -4, rotY: 0.3 },
    { x: -4, z: -6, rotY: 0.15 },
    { x: -1.2, z: -7, rotY: 0.05 },
    { x: 1.2, z: -7, rotY: -0.05 },
    { x: 4, z: -6, rotY: -0.15 },
    { x: 7, z: -4, rotY: -0.3 },
  ];

  return (
    <group>
      {positions.map((pos, i) => (
        <Pedestal key={i} {...pos} index={i} />
      ))}
    </group>
  );
}

function Pedestal({
  x,
  z,
  rotY,
  index,
}: {
  x: number;
  z: number;
  rotY: number;
  index: number;
}) {
  const glowRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity =
        0.7 + Math.sin(clock.elapsedTime * 0.6 + index * 1.1) * 0.3;
    }
  });

  /*
   * Tapered pedestal — wider at the base, narrower at the top.
   * Two stacked sections: a chunky base and a slimmer column,
   * like a lectern designed by someone who played too much
   * Mass Effect. The glowing face tilts back slightly so it
   * reads as a display surface, not a billboard.
   */
  const baseY = -4.95;
  const pedestalMat = (
    <meshStandardMaterial
      color="#1a1535"
      roughness={0.5}
      metalness={0.6}
      emissive="#0d0a1e"
      emissiveIntensity={0.1}
    />
  );

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* base section — wide and squat */}
      <mesh position={[0, baseY + 0.7, 0]}>
        <boxGeometry args={[1.6, 1.4, 0.9]} />
        {pedestalMat}
      </mesh>
      {/* mid column — tapers inward */}
      <mesh position={[0, baseY + 2.0, 0]}>
        <boxGeometry args={[1.2, 1.2, 0.7]} />
        {pedestalMat}
      </mesh>
      {/* upper column — the neck */}
      <mesh position={[0, baseY + 3.2, 0]}>
        <boxGeometry args={[1.0, 1.2, 0.6]} />
        {pedestalMat}
      </mesh>
      {/* display surface — tilted back slightly */}
      <mesh
        position={[0, baseY + 3.85, 0.15]}
        rotation={[-0.3, 0, 0]}
      >
        <boxGeometry args={[0.95, 0.08, 0.55]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      {/* glowing face — the interface screen */}
      <mesh ref={glowRef} position={[0, baseY + 2.5, 0.36]}>
        <boxGeometry args={[0.85, 2.4, 0.02]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>
      {/* base trim — grounding light strip */}
      <mesh position={[0, baseY + 0.03, 0.2]}>
        <boxGeometry args={[1.7, 0.06, 1.0]} />
        <meshStandardMaterial
          color="#00d2ff"
          emissive="#00d2ff"
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/*
 * 💡 Viewport Glow
 * ──────────────────
 * A luminous border around the viewport opening.
 * Wider and brighter than before — the Gemini
 * station believed the first thing you frame
 * should be the thing worth looking at.
 *
 * In this case: everything out there.
 */
function ViewportGlow() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    if (ref.current) {
      const intensity = 1.2 + Math.sin(clock.elapsedTime * 0.8) * 0.4;
      ref.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            intensity;
        }
      });
    }
  });

  return (
    <group ref={ref}>
      {/* top glow */}
      <mesh position={[0, 4.2, -10.9]}>
        <boxGeometry args={[19.5, 0.2, 0.15]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* bottom glow */}
      <mesh position={[0, -1.7, -10.9]}>
        <boxGeometry args={[19.5, 0.2, 0.15]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* left glow */}
      <mesh position={[-9.2, 1.25, -10.9]}>
        <boxGeometry args={[0.2, 6.1, 0.15]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      {/* right glow */}
      <mesh position={[9.2, 1.25, -10.9]}>
        <boxGeometry args={[0.2, 6.1, 0.15]} />
        <meshStandardMaterial
          color="#00ffcc"
          emissive="#00ffcc"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
