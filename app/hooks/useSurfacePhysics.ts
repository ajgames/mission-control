import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  EYE_HEIGHT,
  SURFACE_MAX_RANGE,
} from "~/utils/grandnessEffect";

/*
 * 🌍 useSurfacePhysics — boots on the ground
 * ────────────────────────────────────────────
 * When you step outside the ship, the math changes.
 * No more orbital mechanics. No more thrust vectors.
 * Just a person, a planet, and WASD.
 *
 * The coordinate frame rotates with the terrain —
 * "forward" means forward relative to the ground
 * under your feet, not some cosmic absolute.
 * Walk north? That's north where YOU are.
 *
 *   ┌───────────────────────────────┐
 *   │  terrain-up  = away from planet center  │
 *   │  forward     = yaw around terrain-up    │
 *   │  right       = cross(forward, up)       │
 *   │  movement    = WASD in this frame       │
 *   │  snap to terrain via raycast            │
 *   └───────────────────────────────┘
 */

// ── surface walking physics ──
const SURFACE_SPEED = 6;

// ── reusable math objects (no allocations in the frame loop) ──
const _raycaster = new THREE.Raycaster();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _surfaceFwd = new THREE.Vector3();
const _surfaceRight = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _tempV3 = new THREE.Vector3();

export function useSurfacePhysics({
  modeRef,
  camera,
  surfacePos,
  surfaceYaw,
  surfacePitch,
  terrainUpRef,
  shipLandingPos,
  universeRef,
  terrainMeshRef,
  shipVelocityRef,
  gatherInput,
}: SurfacePhysicsParams) {
  useFrame((_, delta) => {
    if (modeRef.current !== "surface") return;

    const dt = Math.min(delta, 0.05);
    const up = terrainUpRef.current;

    /*
     * 🧭 Build the surface coordinate frame
     *
     * Up = terrain normal (away from planet center)
     * Forward = yaw rotation around Up, projected onto the terrain plane
     * Right = cross product of Up and Forward
     */
    _surfaceFwd.set(
      Math.sin(surfaceYaw.current),
      0,
      Math.cos(surfaceYaw.current)
    );
    _surfaceFwd.addScaledVector(up, -_surfaceFwd.dot(up)).normalize();
    _surfaceRight.crossVectors(_surfaceFwd, up).normalize();

    // ── movement input (rewritten as directional mapping) ──
    const raw = gatherInput();
    _moveDir.set(0, 0, 0);
    // raw.z < 0 = W pressed (forward), raw.z > 0 = S (backward)
    // raw.x < 0 = A pressed (left), raw.x > 0 = D (right)
    if (raw.z !== 0) _moveDir.addScaledVector(_surfaceFwd, -raw.z);
    if (raw.x !== 0) _moveDir.addScaledVector(_surfaceRight, raw.x);

    if (_moveDir.lengthSq() > 0) {
      _moveDir.clampLength(0, 1);
      surfacePos.current.addScaledVector(_moveDir, SURFACE_SPEED * dt);
    }

    // ── boundary: max distance from ship landing point ──
    _tempV3.copy(surfacePos.current).sub(shipLandingPos.current);
    const distFromShip = _tempV3.length();
    if (distFromShip > SURFACE_MAX_RANGE) {
      _tempV3.normalize().multiplyScalar(SURFACE_MAX_RANGE);
      surfacePos.current.copy(shipLandingPos.current).add(_tempV3);
    }

    // ── raycast down to snap to terrain height ──
    const terrainMesh = terrainMeshRef?.current;
    if (terrainMesh) {
      _rayOrigin.copy(surfacePos.current).addScaledVector(up, 50);
      _rayDir.copy(up).negate();
      _raycaster.set(_rayOrigin, _rayDir);
      _raycaster.far = 200;

      const hits = _raycaster.intersectObject(terrainMesh, false);
      if (hits.length > 0) {
        surfacePos.current.copy(hits[0].point).addScaledVector(up, EYE_HEIGHT);
      }
    }

    // ── update camera position and orientation ──
    if (universeRef?.current) {
      camera.position
        .copy(surfacePos.current)
        .add(universeRef.current.position);
    } else {
      camera.position.copy(surfacePos.current);
    }

    // build camera quaternion from terrain-up + yaw/pitch
    const baseQ = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      up
    );
    const yawQ = new THREE.Quaternion().setFromAxisAngle(up, surfaceYaw.current);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(baseQ).applyQuaternion(yawQ);
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(right, surfacePitch.current);

    camera.quaternion.copy(pitchQ).multiply(yawQ).multiply(baseQ);

    // broadcast zero velocity in surface mode
    if (shipVelocityRef?.current) {
      shipVelocityRef.current.set(0, 0, 0);
    }
  });
}

/* ─── Types at the bottom, as is tradition ─── */

import type { ControlMode } from "~/components/Scene";

interface SurfacePhysicsParams {
  modeRef: React.RefObject<ControlMode>;
  camera: THREE.Camera;
  surfacePos: React.RefObject<THREE.Vector3>;
  surfaceYaw: React.RefObject<number>;
  surfacePitch: React.RefObject<number>;
  terrainUpRef: React.RefObject<THREE.Vector3>;
  shipLandingPos: React.RefObject<THREE.Vector3>;
  universeRef?: React.RefObject<THREE.Group>;
  terrainMeshRef?: React.RefObject<THREE.Mesh | null>;
  shipVelocityRef?: React.RefObject<THREE.Vector3>;
  gatherInput: () => THREE.Vector3;
}
