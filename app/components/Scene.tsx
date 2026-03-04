import { useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { Sun } from "./Sun";
import { Moon } from "./Moon";
import { Nebula } from "./Nebula";
import { Cockpit } from "./Cockpit";
import { CabinControls } from "./CabinControls";
import { HUD } from "./HUD";
import { MobileControls } from "./MobileControls";
import { useAmbientAudio } from "~/hooks/useAmbientAudio";
import { useIsMobile } from "~/hooks/useIsMobile";

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
 *     in Chrome, Firefox, Safari, and now...
 *     on your phone in the bathroom.
 *         — Every frontend dev ever
 */

export function Scene() {
  const [locked, setLocked] = useState(false);
  const [navMode, setNavMode] = useState(false);
  const isMobile = useIsMobile();

  // 🕹️ shared refs — the bridge between HTML buttons and the 3D frame loop
  const virtualKeys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, z: 0 });

  // 🌌 the universe group — when the ship moves, the universe moves around it
  // (because in space, everything is relative, and the ship is always at center stage)
  const universeRef = useRef<THREE.Group>(null!);

  // 🎵 the ship hums whether you're at the helm or not
  useAmbientAudio("/space-ambient-low.wav", locked);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black touch-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 70, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* ambient light — enough to see the walls have walls */}
        <ambientLight intensity={0.2} color="#2a1f4e" />

        {/* main light — now aimed INTO the scene so the planet's pretty side faces us */}
        <directionalLight
          position={[-60, 40, 40]}
          intensity={2}
          color="#fff5e6"
        />

        <CabinControls
          onLockChange={setLocked}
          onNavModeChange={setNavMode}
          navMode={navMode}
          isMobile={isMobile}
          virtualKeys={virtualKeys}
          joystick={joystick}
          universeRef={universeRef}
        />

        {/* 🌌 the universe — this group moves when the ship flies */}
        <group ref={universeRef}>
          <Nebula />
          <Sun />
          <Starfield />
          <Planet />
          <Moon />
        </group>

        {/* 🛸 the cockpit stays at origin — it IS the ship */}
        <Cockpit />
      </Canvas>

      {/* HTML overlay — floating above the 3D like a ghost with opinions */}
      <HUD locked={locked} navMode={navMode} isMobile={isMobile} />

      {/* 📱 mobile gamepad — for thumb-piloting through the cosmos */}
      {isMobile && locked && (
        <MobileControls virtualKeys={virtualKeys} joystick={joystick} />
      )}
    </div>
  );
}
