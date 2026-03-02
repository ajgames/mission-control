import { Canvas } from "@react-three/fiber";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { Cockpit } from "./Cockpit";
import { HUD } from "./HUD";

/*
 * 🌌 The Scene
 * ────────────────────────────────────────────
 * This is where it all comes together.
 * Canvas meets cockpit meets cosmos.
 *
 * Three.js renders the universe.
 * HTML renders the interface.
 * Together they render... meaning? Maybe.
 *
 * At least they render at 60fps.
 *
 *    "The universe is under no obligation
 *     to make sense to you."
 *         — Neil deGrasse Tyson
 *
 *     But it IS obligated to render correctly
 *     in Chrome, Firefox, and Safari.
 *         — Every frontend dev ever
 */

export function Scene() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 70, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* ambient light — just enough to see the cockpit panels */}
        <ambientLight intensity={0.15} />

        {/* main light — the star this planet orbits */}
        <directionalLight
          position={[-50, 30, -80]}
          intensity={2}
          color="#fff5e6"
        />

        {/* fill light — because space has bounce light too (it doesn't, but it looks better) */}
        <pointLight position={[5, 2, 3]} intensity={0.3} color="#4a90d9" />

        {/* console glow — the instruments illuminate the pilot */}
        <pointLight position={[0, -3, -3]} intensity={0.4} color="#00d2ff" />

        <Starfield />
        <Planet />
        <Cockpit />
      </Canvas>

      {/* HTML overlay — floating above the 3D like a ghost with opinions */}
      <HUD />
    </div>
  );
}
