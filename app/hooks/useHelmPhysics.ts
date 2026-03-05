import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getDistanceToSurface,
  computeZenoMultiplier,
  PLANET_LOCAL_POS,
  GM,
  LANDING_HEIGHT,
} from "~/utils/grandnessEffect";

/*
 * 🚀 useHelmPhysics — the soul of the ship
 * ────────────────────────────────────────────
 * Everything that happens when you sit in the chair
 * and push a stick: angular velocity, thrust, gravity,
 * decomposed drag, terrain collision, landing detection,
 * universe translation, cockpit rotation, velocity broadcast.
 *
 * This hook runs its own useFrame. All communication is
 * through refs — no React state, no re-renders, just
 * 60fps of Newtonian drama.
 *
 *   "She handles like a cathedral that learned to fly."
 *       — Someone who clearly never flew a cathedral
 *
 *        ┌──────────────────────────────┐
 *        │  angular → orientation       │
 *        │  thrust  → acceleration      │
 *        │  gravity → the humbling      │
 *        │  drag    → the compromise    │
 *        │  terrain → the ground truth  │
 *        └──────────────────────────────┘
 */

// ── helm physics tuning — the cathedral's personality ──
const HELM_THRUST = 14;
const HELM_STRAFE = 12;
const HELM_RADIAL_DRAG = 0.985;
const HELM_TANGENTIAL_DRAG = 0.998;
export const HELM_PITCH_SPEED = 0.0015;
export const HELM_ROLL_SPEED = 0.002;
const HELM_ANGULAR_DRAG = 0.93;

// the viewport seat — where the camera snaps when you take the helm
export const HELM_POSITION = new THREE.Vector3(0, 0.2, -7.5);

// ── reusable math objects (no allocations in the frame loop) ──
const _tempV3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();

export function useHelmPhysics({
  modeRef,
  camera,
  shipQuaternion,
  angularVelocity,
  shipVelocity,
  landedRef,
  shipWorldPosRef,
  shipVelocityRef,
  universeRef,
  cockpitRef,
  terrainMeshRef,
  setLanded,
  gatherInput,
}: HelmPhysicsParams) {
  useFrame((_, delta) => {
    if (modeRef.current !== "helm") return;

    const dt = Math.min(delta, 0.05);

    // ── 1. angular velocity → orientation ──
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      angularVelocity.current.pitch * dt * 60
    );
    const rollQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      angularVelocity.current.roll * dt * 60
    );

    shipQuaternion.current.multiply(pitchQ);
    shipQuaternion.current.multiply(rollQ);
    shipQuaternion.current.normalize();
    camera.quaternion.copy(shipQuaternion.current);

    const angDrag = Math.pow(HELM_ANGULAR_DRAG, dt * 60);
    angularVelocity.current.pitch *= angDrag;
    angularVelocity.current.roll *= angDrag;

    if (Math.abs(angularVelocity.current.pitch) < 0.00005)
      angularVelocity.current.pitch = 0;
    if (Math.abs(angularVelocity.current.roll) < 0.00005)
      angularVelocity.current.roll = 0;

    // ── 2. thrust → acceleration ──
    const thrust = gatherInput();

    if (thrust.lengthSq() > 0) {
      thrust.clampLength(0, 1);
      thrust.applyQuaternion(shipQuaternion.current);

      const surfDist = shipWorldPosRef?.current
        ? getDistanceToSurface(shipWorldPosRef.current)
        : 999;
      const zenoMult = computeZenoMultiplier(surfDist);

      // if landed, only allow tangential thrust (no pushing through the ground)
      if (landedRef.current) {
        const up = _tempV3
          .copy(shipWorldPosRef?.current ?? PLANET_LOCAL_POS)
          .sub(PLANET_LOCAL_POS)
          .normalize();
        const downComponent = thrust.dot(up);
        if (downComponent < 0) {
          thrust.addScaledVector(up, -downComponent);
        }
      }

      const mag =
        (Math.abs(thrust.z) > 0.5 ? HELM_THRUST : HELM_STRAFE) * zenoMult;
      shipVelocity.current.addScaledVector(thrust, mag * dt);
    }

    // 🍎 2b. gravity
    if (shipWorldPosRef?.current) {
      const toPlanet = PLANET_LOCAL_POS.clone().sub(shipWorldPosRef.current);
      const rDist = Math.max(toPlanet.length(), 42);
      const gravAccel = GM / (rDist * rDist);
      const gravDir = toPlanet.normalize();

      if (!landedRef.current) {
        shipVelocity.current.addScaledVector(gravDir, gravAccel * dt);
      }
    }

    // ── 3. decomposed drag ──
    if (shipWorldPosRef?.current) {
      const toPlanet = PLANET_LOCAL_POS.clone().sub(shipWorldPosRef.current);
      const rDist = toPlanet.length();

      if (rDist > 0.1) {
        const rHat = toPlanet.divideScalar(rDist);
        const vel = shipVelocity.current;
        const radialSpeed = vel.dot(rHat);
        const vRadial = rHat.clone().multiplyScalar(radialSpeed);
        const vTangential = vel.clone().sub(vRadial);

        const radDrag = Math.pow(HELM_RADIAL_DRAG, dt * 60);
        const tanDrag = Math.pow(HELM_TANGENTIAL_DRAG, dt * 60);

        vRadial.multiplyScalar(radDrag);
        vTangential.multiplyScalar(tanDrag);

        vel.copy(vRadial).add(vTangential);
      } else {
        shipVelocity.current.multiplyScalar(
          Math.pow(HELM_RADIAL_DRAG, dt * 60)
        );
      }
    } else {
      shipVelocity.current.multiplyScalar(
        Math.pow(HELM_RADIAL_DRAG, dt * 60)
      );
    }

    if (shipVelocity.current.lengthSq() < 0.0001) {
      shipVelocity.current.set(0, 0, 0);
    }

    // ── 4. integrate position ──
    camera.position.copy(HELM_POSITION);
    if (shipWorldPosRef?.current) {
      shipWorldPosRef.current.addScaledVector(shipVelocity.current, dt);
    }

    // ── 4b. terrain collision — the ground is real now ──
    const terrainMesh = terrainMeshRef?.current;
    if (terrainMesh && shipWorldPosRef?.current) {
      /*
       * 🏔️ Raycast toward the planet center from the ship
       *
       * The terrain mesh lives in universe-space.
       * The ship is at the origin (universe moves around it).
       * So in scene-space, the terrain's world matrix accounts
       * for the universe group's translation.
       *
       * We cast a ray from slightly above where we think we are,
       * toward the planet center (in scene space), and check
       * if the terrain catches us.
       */
      const planetScenePos = _tempV3
        .copy(PLANET_LOCAL_POS)
        .sub(shipWorldPosRef.current);

      _rayDir.copy(planetScenePos).normalize();
      _rayOrigin.copy(_rayDir).negate().multiplyScalar(2);
      _raycaster.set(_rayOrigin, _rayDir);
      _raycaster.far = 100;

      const hits = _raycaster.intersectObject(terrainMesh, false);
      if (hits.length > 0) {
        const hitDist = hits[0].distance;
        const terrainDist = hitDist - 2;

        if (terrainDist < LANDING_HEIGHT) {
          /*
           * 🛬 Contact! Push the ship back up.
           *
           * Kill radial velocity (the component toward the planet).
           * Push ship position outward so it hovers at LANDING_HEIGHT.
           * If velocity is nearly zero → we're landed.
           */
          const upDir = _rayDir.clone().negate();
          const radialSpeed = shipVelocity.current.dot(_rayDir);
          if (radialSpeed > 0) {
            shipVelocity.current.addScaledVector(_rayDir, -radialSpeed);
          }

          const pushAmount = LANDING_HEIGHT - terrainDist;
          if (shipWorldPosRef.current) {
            shipWorldPosRef.current.addScaledVector(upDir, pushAmount);
          }

          if (shipVelocity.current.lengthSq() < 0.5) {
            if (!landedRef.current) {
              setLanded(true);
            }
          }
        } else if (terrainDist > LANDING_HEIGHT + 2) {
          if (landedRef.current) {
            setLanded(false);
          }
        }
      } else {
        if (landedRef.current) {
          setLanded(false);
        }
      }
    }

    // universe slides opposite to where the ship is heading
    if (universeRef?.current && shipWorldPosRef?.current) {
      universeRef.current.position.set(
        -shipWorldPosRef.current.x,
        -shipWorldPosRef.current.y,
        -shipWorldPosRef.current.z
      );
    }

    // cockpit rotates with the ship, pivoting around the helm seat
    if (cockpitRef?.current) {
      cockpitRef.current.quaternion.copy(shipQuaternion.current);
      const offset = HELM_POSITION.clone().negate();
      offset.applyQuaternion(shipQuaternion.current);
      offset.add(HELM_POSITION);
      cockpitRef.current.position.copy(offset);
    }

    // broadcast velocity
    if (shipVelocityRef?.current) {
      shipVelocityRef.current.copy(shipVelocity.current);
    }
  });
}

/* ─── Types at the bottom, as is tradition ─── */

import type { ControlMode } from "~/components/Scene";

interface HelmPhysicsParams {
  modeRef: React.RefObject<ControlMode>;
  camera: THREE.Camera;
  shipQuaternion: React.RefObject<THREE.Quaternion>;
  angularVelocity: React.RefObject<{ pitch: number; roll: number }>;
  shipVelocity: React.RefObject<THREE.Vector3>;
  landedRef: React.RefObject<boolean>;
  shipWorldPosRef?: React.RefObject<THREE.Vector3>;
  shipVelocityRef?: React.RefObject<THREE.Vector3>;
  universeRef?: React.RefObject<THREE.Group>;
  cockpitRef?: React.RefObject<THREE.Group>;
  terrainMeshRef?: React.RefObject<THREE.Mesh | null>;
  setLanded: (val: boolean) => void;
  gatherInput: () => THREE.Vector3;
}
