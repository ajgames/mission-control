import { useState, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  getDistanceToSurface,
  TERRAIN_APPEAR_DIST,
  TERRAIN_OPAQUE_DIST,
} from "~/utils/grandnessEffect";
import { Starfield } from "./Starfield";
import { Planet } from "./Planet";
import { Sun } from "./Sun";
import { Moon } from "./Moon";
import { Nebula } from "./Nebula";
import { Cockpit } from "./Cockpit";
import { Terrain } from "./Terrain";
import { CabinControls } from "./CabinControls";
import { HUD } from "./HUD";
import { MobileControls } from "./MobileControls";
import { useAmbientAudio } from "~/hooks/useAmbientAudio";
import { useIsMobile } from "~/hooks/useIsMobile";

/*
 * 🌌 The Scene
 * ────────────────────────────────────────────
 * This is where it all comes together.
 * Canvas meets cockpit meets cosmos meets... ground?
 *
 * Three.js renders the universe.
 * HTML renders the interface.
 * Together they render... meaning? Maybe.
 *
 * At least they render at 60fps.
 *
 * Now with THREE control modes:
 *   🚶 cabin  — walk around the tin can
 *   🚀 helm   — fly the ship
 *   🌍 surface — walk on the planet
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
  const [controlMode, setControlMode] = useState<ControlMode>("cabin");
  const [landed, setLanded] = useState(false);
  const isMobile = useIsMobile();

  // 🕹️ shared refs — the bridge between HTML buttons and the 3D frame loop
  const virtualKeys = useRef(new Set<string>());
  const joystick = useRef({ x: 0, z: 0 });

  // 🌌 the universe group — when the ship moves, the universe moves around it
  // (because in space, everything is relative, and the ship is always at center stage)
  const universeRef = useRef<THREE.Group>(null!);

  // 🛸 the cockpit group — rotates around the helm seat during flight
  const cockpitRef = useRef<THREE.Group>(null!);

  // 📍 the ship's accumulated world position — shared between Planet and CabinControls
  // so the planet knows how close you are and the controls know when to slow down
  const shipWorldPosRef = useRef(new THREE.Vector3());

  // 🏎️ the ship's velocity — how fast she's moving relative to the planet
  // three numbers that tell you everything: am I closing, drifting, or falling?
  const shipVelocityRef = useRef(new THREE.Vector3());

  // 🏔️ terrain mesh ref — CabinControls raycasts against this for landing and walking
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const handleTerrainMeshReady = useCallback((mesh: THREE.Mesh) => {
    terrainMeshRef.current = mesh;
  }, []);

  // backward-compat: derive navMode boolean for components that still speak boolean
  const navMode = controlMode === "helm";

  // 🎵 the ship hums whether you're at the helm or not
  useAmbientAudio("/space-ambient-low.wav", locked);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black touch-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 70, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* 🌫️ atmospheric adapter — adjusts FOV, fog, and far plane
         *  based on proximity to the planet surface.
         *  This is the perceptual glue that sells the transition.
         */}
        <AtmosphericAdapter
          shipWorldPosRef={shipWorldPosRef}
          controlMode={controlMode}
        />

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
          onControlModeChange={setControlMode}
          controlMode={controlMode}
          isMobile={isMobile}
          virtualKeys={virtualKeys}
          joystick={joystick}
          universeRef={universeRef}
          cockpitRef={cockpitRef}
          shipWorldPosRef={shipWorldPosRef}
          shipVelocityRef={shipVelocityRef}
          terrainMeshRef={terrainMeshRef}
          onLandedChange={setLanded}
        />

        {/* 🌌 the universe — this group moves when the ship flies */}
        <group ref={universeRef}>
          <Nebula />
          <Sun />
          <Starfield />
          <Planet shipWorldPosRef={shipWorldPosRef} />
          <Moon />

          {/* 🏔️ terrain — the non-Euclidean ground that appears at close range */}
          <Terrain
            shipWorldPosRef={shipWorldPosRef}
            onTerrainMeshReady={handleTerrainMeshReady}
          />
        </group>

        {/* 🛸 the cockpit — rotates with the ship during helm mode, hidden on surface */}
        <group ref={cockpitRef} visible={controlMode !== "surface"}>
          <Cockpit />
        </group>
      </Canvas>

      {/* HTML overlay — floating above the 3D like a ghost with opinions */}
      <HUD
        locked={locked}
        controlMode={controlMode}
        isMobile={isMobile}
        shipWorldPosRef={shipWorldPosRef}
        shipVelocityRef={shipVelocityRef}
        landed={landed}
      />

      {/* 📱 mobile gamepad — for thumb-piloting through the cosmos */}
      {isMobile && locked && (
        <MobileControls virtualKeys={virtualKeys} joystick={joystick} navMode={navMode} />
      )}
    </div>
  );
}

/*
 * 🌫️ AtmosphericAdapter — the non-Euclidean glue
 * ────────────────────────────────────────────────
 * Runs inside the Canvas (useFrame access).
 * As the ship approaches the planet:
 *
 *   1. FOV widens 70° → 85° — the world feels bigger
 *   2. Scene fog fades in — the background becomes atmospheric
 *   3. Far plane extends on surface — terrain needs room to render
 *
 * On surface mode, the fog thickens and the FOV locks wide.
 * The sky isn't black anymore. There's a world here.
 *
 *   space:   ★ ★ ★ ★ ★ (FOV 70, no fog, blackness)
 *   descent: ★ ★ · · · (FOV 75, light haze)
 *   landed:  · · · · · (FOV 82, thick atmosphere)
 *   surface: ~~~~~~~~~ (FOV 85, full atmospheric haze)
 */
function AtmosphericAdapter({
  shipWorldPosRef,
  controlMode,
}: {
  shipWorldPosRef: React.RefObject<THREE.Vector3>;
  controlMode: ControlMode;
}) {
  const { camera, scene } = useThree();

  useFrame(() => {
    if (!shipWorldPosRef?.current) return;

    const perspCam = camera as THREE.PerspectiveCamera;
    const surfDist = getDistanceToSurface(shipWorldPosRef.current);

    if (controlMode === "surface") {
      // on the surface — full atmospheric presence
      perspCam.fov = THREE.MathUtils.lerp(perspCam.fov, 85, 0.05);
      perspCam.far = 800;
      perspCam.near = 0.05;

      // thick atmospheric fog
      if (!scene.fog || !(scene.fog instanceof THREE.Fog)) {
        scene.fog = new THREE.Fog("#3d5a7a", 80, 350);
      }
      const fog = scene.fog as THREE.Fog;
      fog.color.lerp(new THREE.Color("#3d5a7a"), 0.05);
      fog.near = THREE.MathUtils.lerp(fog.near, 80, 0.05);
      fog.far = THREE.MathUtils.lerp(fog.far, 350, 0.05);
    } else if (surfDist < TERRAIN_APPEAR_DIST) {
      // approaching — gradual transition
      const t = Math.max(
        0,
        Math.min(
          1,
          (TERRAIN_APPEAR_DIST - surfDist) /
            (TERRAIN_APPEAR_DIST - TERRAIN_OPAQUE_DIST)
        )
      );

      // FOV widens as you descend — the world expands around you
      const targetFOV = 70 + t * 15; // 70° → 85°
      perspCam.fov = THREE.MathUtils.lerp(perspCam.fov, targetFOV, 0.05);
      perspCam.far = 2000 + t * 600; // extend for terrain
      perspCam.near = 0.1 - t * 0.05; // tighten near plane

      // atmospheric fog fades in
      if (t > 0.05) {
        if (!scene.fog || !(scene.fog instanceof THREE.Fog)) {
          scene.fog = new THREE.Fog("#3d5a7a", 600, 2000);
        }
        const fog = scene.fog as THREE.Fog;
        // fog gets closer as you descend
        const fogNear = 600 - t * 500;   // 600 → 100
        const fogFar = 2000 - t * 1500;  // 2000 → 500
        fog.near = THREE.MathUtils.lerp(fog.near, fogNear, 0.03);
        fog.far = THREE.MathUtils.lerp(fog.far, fogFar, 0.03);
        fog.color.lerp(new THREE.Color("#3d5a7a"), 0.03);
      }
    } else {
      // in space — restore defaults
      perspCam.fov = THREE.MathUtils.lerp(perspCam.fov, 70, 0.05);
      perspCam.far = 2000;
      perspCam.near = 0.1;
      // dissolve fog
      if (scene.fog && scene.fog instanceof THREE.Fog) {
        const fog = scene.fog as THREE.Fog;
        fog.near = THREE.MathUtils.lerp(fog.near, 2000, 0.05);
        fog.far = THREE.MathUtils.lerp(fog.far, 3000, 0.05);
        if (fog.near > 1900) {
          scene.fog = null;
        }
      }
    }

    perspCam.updateProjectionMatrix();
  });

  return null;
}

/* ─── Types at the bottom, as is tradition ─── */

export type ControlMode = "cabin" | "helm" | "surface";
