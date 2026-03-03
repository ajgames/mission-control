import * as THREE from "three";

/*
 * ☀️ The Sun
 * ────────────────────────────────────────────
 * Every story needs a light source,
 * and every light source needs a story.
 *
 * She sits far off to port, blazing away
 * with the quiet confidence of something
 * that doesn't need to prove it's on fire.
 *
 * The directional light does the heavy lifting,
 * but this is her body — the visible proof
 * that all that warmth comes from somewhere.
 *
 *        \   |   /
 *      --- ☀ ---
 *        /   |   \
 *
 * Fun fact: the real sun is 109× Earth's diameter.
 * This one is... close enough for jazz.
 */

export function Sun() {
  return (
    <group position={[-300, 200, 200]}>
      {/* the star herself — meshBasicMaterial so she glows on her own terms */}
      <mesh>
        <sphereGeometry args={[25, 32, 32]} />
        <meshBasicMaterial
          color="#fff4d6"
          toneMapped={false}
        />
      </mesh>

      {/* corona glow — a softer halo for that "stare too long and regret it" vibe */}
      <mesh>
        <sphereGeometry args={[32, 32, 32]} />
        <meshBasicMaterial
          color="#ffcc66"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>

      {/* radial warmth — a gentle point light so nearby objects catch her glow */}
      <pointLight
        intensity={0.8}
        color="#ffe0a0"
        distance={800}
        decay={2}
      />
    </group>
  );
}
