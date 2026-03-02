import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { Cockpit } from "./Cockpit";
import { CabinControls } from "./CabinControls";
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
  const [locked, setLocked] = useState(false);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 70, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* ambient light — the faintest kiss of visibility */}
        <ambientLight intensity={0.08} />

        {/* main light — the star this planet orbits */}
        <directionalLight
          position={[-50, 30, -80]}
          intensity={2}
          color="#fff5e6"
        />

        <CabinControls onLockChange={setLocked} />
        <Starfield />
        <Planet />
        <Cockpit />
      </Canvas>

      {/* HTML overlay — floating above the 3D like a ghost with opinions */}
      <HUD locked={locked} />
    </div>
  );
}
