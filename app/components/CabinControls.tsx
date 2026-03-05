import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  getDistanceToSurface,
  computeZenoMultiplier,
  PLANET_LOCAL_POS,
  GM,
} from "~/utils/grandnessEffect";
import {
  LANDING_HEIGHT,
  EYE_HEIGHT,
  SURFACE_MAX_RANGE,
} from "~/utils/terrainNoise";
import type { ControlMode } from "./Scene";

/*
 * 🎮 Cabin Controls — now with THREE modes
 * ────────────────────────────────────────────
 * Three lives in one component:
 *
 * 🚶 CABIN MODE (default)
 *   Click to lock. WASD to wander. Mouse to look.
 *   You're a person in a tin can. Walls are real.
 *
 * 🚀 HELM MODE (press E)
 *   The camera snaps forward. You ARE the ship now.
 *   WASD = thrust & strafe (with inertia — Newton's first!)
 *   Mouse = pitch & roll (because yaw is for amateurs)
 *   ESC or E = back to being a person
 *
 * 🌍 SURFACE MODE (press F when landed)
 *   The hatch opens. You step outside.
 *   WASD walks on the planet surface.
 *   Mouse looks around relative to terrain-up.
 *   Press F near the ship to re-board.
 *
 *   "She doesn't handle like a fighter.
 *    She handles like a cathedral that learned to fly.
 *    And now she's parked on alien soil."
 *
 *        ┌─────────────────────────┐
 *        │  cabin ─E→ helm ─F→ surface  │
 *        │  cabin ←E─ helm ←F─ surface  │
 *        └─────────────────────────┘
 */

// ── cabin boundaries — the walls of the tin can ──
const BOUNDS = {
  x: { min: -10, max: 10 },
  y: { min: -3, max: 5 },
  z: { min: -9, max: 6 },
};

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.002;
const TOUCH_SENSITIVITY = 0.004;

// ── helm physics — gravity ship feel ──
const HELM_THRUST = 14;
const HELM_STRAFE = 12;
const HELM_RADIAL_DRAG = 0.985;
const HELM_TANGENTIAL_DRAG = 0.998;
const HELM_PITCH_SPEED = 0.0015;
const HELM_ROLL_SPEED = 0.002;
const HELM_ANGULAR_DRAG = 0.93;

// the viewport seat — where the camera snaps when you take the helm
const HELM_POSITION = new THREE.Vector3(0, 0.2, -7.5);

// ── surface walking physics ──
const SURFACE_SPEED = 6;
const REBOARD_DISTANCE = 5; // how close you need to be to the ship to re-board

// ── reusable math objects (no allocations in the frame loop) ──
const _raycaster = new THREE.Raycaster();
const _rayDir = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _surfaceFwd = new THREE.Vector3();
const _surfaceRight = new THREE.Vector3();
const _surfaceUp = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _tempV3 = new THREE.Vector3();

export function CabinControls({
  onLockChange,
  onControlModeChange,
  controlMode = "cabin",
  isMobile = false,
  virtualKeys,
  joystick,
  universeRef,
  cockpitRef,
  shipWorldPosRef,
  shipVelocityRef,
  terrainMeshRef,
  onLandedChange,
}: CabinControlsProps) {
  const { camera, gl } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const keys = useRef<Set<string>>(new Set());
  const isLocked = useRef(false);

  // touch tracking for mobile camera look
  const activeTouchId = useRef<number | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);

  // ── helm state — the ship's memory ──
  const modeRef = useRef<ControlMode>("cabin");
  const shipVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const angularVelocity = useRef({ pitch: 0, roll: 0 });
  const shipQuaternion = useRef(new THREE.Quaternion());
  const savedCameraPos = useRef(new THREE.Vector3());
  const savedCameraQuat = useRef(new THREE.Quaternion());

  // ── landing state ──
  const landedRef = useRef(false);

  // ── surface walking state ──
  // position on the terrain in universe-space (absolute world pos)
  const surfacePos = useRef(new THREE.Vector3());
  const surfaceYaw = useRef(0);
  const surfacePitch = useRef(0);
  // the terrain-up direction at the landing point
  const terrainUpRef = useRef(new THREE.Vector3(0, 1, 0));
  // where the ship was when we disembarked (for distance check)
  const shipLandingPos = useRef(new THREE.Vector3());

  // sync external control mode → internal ref
  useEffect(() => {
    modeRef.current = controlMode;
  }, [controlMode]);

  // 📱 on mobile, auto-engage — no cursor to lock, just vibes
  useEffect(() => {
    if (isMobile) {
      isLocked.current = true;
      onLockChange?.(true);
    }
  }, [isMobile, onLockChange]);

  const setMode = useCallback(
    (mode: ControlMode) => {
      modeRef.current = mode;
      onControlModeChange?.(mode);
    },
    [onControlModeChange]
  );

  const setLanded = useCallback(
    (val: boolean) => {
      landedRef.current = val;
      onLandedChange?.(val);
    },
    [onLandedChange]
  );

  const enterHelm = useCallback(() => {
    if (modeRef.current === "helm") return;

    // 📸 save where the crew member was standing — in cockpit-local space
    if (cockpitRef?.current) {
      const invQ = cockpitRef.current.quaternion.clone().invert();
      savedCameraPos.current
        .copy(camera.position)
        .sub(cockpitRef.current.position)
        .applyQuaternion(invQ);
      savedCameraQuat.current.copy(invQ).multiply(camera.quaternion);
    } else {
      savedCameraPos.current.copy(camera.position);
      savedCameraQuat.current.copy(camera.quaternion);
    }

    // snap to the viewport seat
    camera.position.copy(HELM_POSITION);
    if (cockpitRef?.current) {
      shipQuaternion.current.copy(cockpitRef.current.quaternion);
    } else {
      const lookTarget = HELM_POSITION.clone().add(new THREE.Vector3(0, 0, -1));
      camera.lookAt(lookTarget);
      shipQuaternion.current.copy(camera.quaternion);
    }
    camera.quaternion.copy(shipQuaternion.current);

    // reset velocities — clean slate, clean conscience
    shipVelocity.current.set(0, 0, 0);
    angularVelocity.current = { pitch: 0, roll: 0 };
    setLanded(false);

    setMode("helm");
  }, [camera, cockpitRef, setMode, setLanded]);

  const exitHelm = useCallback(() => {
    if (modeRef.current !== "helm") return;

    /*
     * 🛬 Disembarking the helm — the ship keeps her heading.
     * Walk around a slanted floor if you must —
     * that's what mag-boots are for.
     */
    if (cockpitRef?.current) {
      const q = cockpitRef.current.quaternion;
      const p = cockpitRef.current.position;
      camera.position
        .copy(savedCameraPos.current)
        .applyQuaternion(q)
        .add(p);
      camera.quaternion.copy(q).multiply(savedCameraQuat.current);
    } else {
      camera.position.copy(savedCameraPos.current);
      camera.quaternion.copy(savedCameraQuat.current);
    }

    euler.current.setFromQuaternion(savedCameraQuat.current);
    shipVelocity.current.set(0, 0, 0);
    angularVelocity.current = { pitch: 0, roll: 0 };
    setLanded(false);

    setMode("cabin");
  }, [camera, cockpitRef, setMode, setLanded]);

  /*
   * 🌍 enterSurface — the hatch opens, the horizon beckons
   *
   * Camera drops to the terrain surface at eye height.
   * The cockpit vanishes (hidden by Scene.tsx visibility toggle).
   * You're standing on alien soil. The stars are above you.
   * The ship is behind you. Everything smells like math.
   */
  const enterSurface = useCallback(() => {
    if (modeRef.current !== "helm" || !landedRef.current) return;

    // the terrain-up direction = from planet center toward the ship
    if (shipWorldPosRef?.current) {
      terrainUpRef.current
        .copy(shipWorldPosRef.current)
        .sub(PLANET_LOCAL_POS)
        .normalize();
    }

    // save ship landing position for re-boarding distance check
    if (shipWorldPosRef?.current) {
      shipLandingPos.current.copy(shipWorldPosRef.current);
    }

    // place camera at ship position + eye height along terrain up
    surfacePos.current.set(0, 0, 0);
    if (shipWorldPosRef?.current) {
      surfacePos.current.copy(shipWorldPosRef.current);
    }

    // initial look direction: ship's forward projected onto the terrain plane
    const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuaternion.current);
    const up = terrainUpRef.current;
    // project ship forward onto terrain plane
    const projected = shipFwd.clone().addScaledVector(up, -shipFwd.dot(up)).normalize();
    surfaceYaw.current = Math.atan2(projected.x, projected.z);
    surfacePitch.current = 0;

    // kill ship velocity — she's parked
    shipVelocity.current.set(0, 0, 0);
    angularVelocity.current = { pitch: 0, roll: 0 };

    setMode("surface");
  }, [camera, shipWorldPosRef, setMode]);

  /*
   * 🚀 exitSurface — back to the tin can
   *
   * Re-enter the cockpit, restore cabin mode.
   * The ship stays where she landed. The universe
   * stays where it was. Only the human moves.
   */
  const exitSurface = useCallback(() => {
    if (modeRef.current !== "surface") return;

    // restore camera to cabin position
    if (cockpitRef?.current) {
      const q = cockpitRef.current.quaternion;
      const p = cockpitRef.current.position;
      camera.position
        .copy(savedCameraPos.current)
        .applyQuaternion(q)
        .add(p);
      camera.quaternion.copy(q).multiply(savedCameraQuat.current);
    } else {
      camera.position.copy(savedCameraPos.current);
      camera.quaternion.copy(savedCameraQuat.current);
    }

    euler.current.setFromQuaternion(savedCameraQuat.current);

    setMode("cabin");
    setLanded(false);
  }, [camera, cockpitRef, setMode, setLanded]);

  /* ─── Desktop: mouse look ─── */
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isLocked.current) return;

      if (modeRef.current === "helm") {
        angularVelocity.current.pitch -= e.movementY * HELM_PITCH_SPEED;
        angularVelocity.current.roll -= e.movementX * HELM_ROLL_SPEED;
        return;
      }

      if (modeRef.current === "surface") {
        /*
         * 🌍 Surface mouselook — yaw around terrain up, pitch around camera right
         * Not world Y. Terrain-up. Because if the terrain is tilted,
         * your sense of "up" should tilt with it.
         */
        surfaceYaw.current -= e.movementX * MOUSE_SENSITIVITY;
        surfacePitch.current -= e.movementY * MOUSE_SENSITIVITY;
        surfacePitch.current = Math.max(
          -Math.PI / 2.5,
          Math.min(Math.PI / 2.5, surfacePitch.current)
        );
        return;
      }

      // cabin mode — euler is LOCAL (relative to the deck)
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY;
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY;
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );
      const localQ = new THREE.Quaternion().setFromEuler(euler.current);
      const cockpitQ = cockpitRef?.current?.quaternion ?? new THREE.Quaternion();
      camera.quaternion.copy(cockpitQ).multiply(localQ);
    },
    [camera, cockpitRef]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      keys.current.add(e.code);

      // 🔑 E = toggle the helm (cabin ↔ helm)
      if (e.code === "KeyE" && isLocked.current) {
        if (modeRef.current === "helm") {
          exitHelm();
        } else if (modeRef.current === "cabin") {
          enterHelm();
        }
      }

      // 🔑 F = toggle surface mode (helm+landed → surface, surface → cabin)
      if (e.code === "KeyF" && isLocked.current) {
        if (modeRef.current === "helm" && landedRef.current) {
          enterSurface();
        } else if (modeRef.current === "surface") {
          exitSurface();
        }
      }
    },
    [enterHelm, exitHelm, enterSurface, exitSurface]
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    keys.current.delete(e.code);
  }, []);

  const onPointerLockChange = useCallback(() => {
    const wasLocked = isLocked.current;
    isLocked.current = document.pointerLockElement === gl.domElement;
    onLockChange?.(isLocked.current);

    if (wasLocked && !isLocked.current && modeRef.current === "helm") {
      exitHelm();
    }
    if (wasLocked && !isLocked.current && modeRef.current === "surface") {
      exitSurface();
    }
  }, [gl.domElement, onLockChange, exitHelm, exitSurface]);

  const onClick = useCallback(() => {
    if (!isLocked.current && !isMobile) {
      gl.domElement.requestPointerLock();
    }
  }, [gl.domElement, isMobile]);

  /* ─── Mobile: touch-drag camera look ─── */
  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isMobile || !isLocked.current) return;
      if (activeTouchId.current !== null) return;
      const touch = e.changedTouches[0];
      activeTouchId.current = touch.identifier;
      lastTouch.current = { x: touch.clientX, y: touch.clientY };
    },
    [isMobile]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isMobile || activeTouchId.current === null) return;

      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch || !lastTouch.current) return;

      const dx = touch.clientX - lastTouch.current.x;
      const dy = touch.clientY - lastTouch.current.y;
      lastTouch.current = { x: touch.clientX, y: touch.clientY };

      if (modeRef.current === "surface") {
        surfaceYaw.current -= dx * TOUCH_SENSITIVITY;
        surfacePitch.current -= dy * TOUCH_SENSITIVITY;
        surfacePitch.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, surfacePitch.current));
        return;
      }

      euler.current.y -= dx * TOUCH_SENSITIVITY;
      euler.current.x -= dy * TOUCH_SENSITIVITY;
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );
      const localQ = new THREE.Quaternion().setFromEuler(euler.current);
      const cockpitQ =
        cockpitRef?.current?.quaternion ?? new THREE.Quaternion();
      camera.quaternion.copy(cockpitQ).multiply(localQ);
    },
    [isMobile, camera, cockpitRef]
  );

  const onTouchEnd = useCallback((e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId.current) {
        activeTouchId.current = null;
        lastTouch.current = null;
        break;
      }
    }
  }, []);

  /* ─── Wire up all the listeners ─── */
  useEffect(() => {
    const canvas = gl.domElement;

    if (isMobile) {
      canvas.addEventListener("touchstart", onTouchStart);
      canvas.addEventListener("touchmove", onTouchMove);
      canvas.addEventListener("touchend", onTouchEnd);
      canvas.addEventListener("touchcancel", onTouchEnd);
    } else {
      canvas.addEventListener("click", onClick);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("pointerlockchange", onPointerLockChange);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      if (isMobile) {
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchend", onTouchEnd);
        canvas.removeEventListener("touchcancel", onTouchEnd);
      } else {
        canvas.removeEventListener("click", onClick);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("pointerlockchange", onPointerLockChange);
      }
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [
    gl.domElement,
    isMobile,
    onClick,
    onMouseMove,
    onPointerLockChange,
    onKeyDown,
    onKeyUp,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  ]);

  // 📱 track ButtonA / ButtonB press edges for mobile
  const buttonAWasDown = useRef(false);
  const buttonBWasDown = useRef(false);

  /* ─── Frame loop ─── */
  useFrame((_, delta) => {
    if (!isLocked.current) return;

    // 📱 detect ButtonA press-edge → toggle helm (mobile's E key)
    if (virtualKeys?.current) {
      const aDown = virtualKeys.current.has("ButtonA");
      if (aDown && !buttonAWasDown.current) {
        if (modeRef.current === "helm") {
          exitHelm();
        } else if (modeRef.current === "cabin") {
          enterHelm();
        }
      }
      buttonAWasDown.current = aDown;

      // ButtonB = F key (disembark/reboard)
      const bDown = virtualKeys.current.has("ButtonB");
      if (bDown && !buttonBWasDown.current) {
        if (modeRef.current === "helm" && landedRef.current) {
          enterSurface();
        } else if (modeRef.current === "surface") {
          exitSurface();
        }
      }
      buttonBWasDown.current = bDown;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🌍 SURFACE MODE — walking on the planet
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (modeRef.current === "surface") {
      const dt = Math.min(delta, 0.05);
      const up = terrainUpRef.current;

      /*
       * 🧭 Build the surface coordinate frame
       *
       * Up = terrain normal (away from planet center)
       * Forward = yaw rotation around Up, projected onto the terrain plane
       * Right = cross product of Up and Forward
       *
       * This gives us a local reference frame that follows the
       * curvature of the terrain. Walk north? That's north relative
       * to where you're standing, not some cosmic absolute.
       */

      // forward direction on the surface plane from yaw
      _surfaceFwd.set(
        Math.sin(surfaceYaw.current),
        0,
        Math.cos(surfaceYaw.current)
      );
      // project onto terrain plane (remove up component)
      _surfaceFwd.addScaledVector(up, -_surfaceFwd.dot(up)).normalize();

      _surfaceRight.crossVectors(_surfaceFwd, up).normalize();
      _surfaceUp.copy(up);

      // ── movement input ──
      _moveDir.set(0, 0, 0);
      if (keys.current.has("KeyW")) _moveDir.addScaledVector(_surfaceFwd, 1);
      if (keys.current.has("KeyS")) _moveDir.addScaledVector(_surfaceFwd, -1);
      if (keys.current.has("KeyA")) _moveDir.addScaledVector(_surfaceRight, -1);
      if (keys.current.has("KeyD")) _moveDir.addScaledVector(_surfaceRight, 1);

      if (virtualKeys?.current) {
        if (virtualKeys.current.has("KeyW")) _moveDir.addScaledVector(_surfaceFwd, 1);
        if (virtualKeys.current.has("KeyS")) _moveDir.addScaledVector(_surfaceFwd, -1);
        if (virtualKeys.current.has("KeyA")) _moveDir.addScaledVector(_surfaceRight, -1);
        if (virtualKeys.current.has("KeyD")) _moveDir.addScaledVector(_surfaceRight, 1);
      }

      if (joystick?.current) {
        _moveDir.addScaledVector(_surfaceRight, joystick.current.x);
        _moveDir.addScaledVector(_surfaceFwd, -joystick.current.z);
      }

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
        // ray origin: current position + some height above terrain
        _rayOrigin.copy(surfacePos.current).addScaledVector(up, 50);
        _rayDir.copy(up).negate();
        _raycaster.set(_rayOrigin, _rayDir);
        _raycaster.far = 200;

        const hits = _raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          // snap to terrain + eye height
          surfacePos.current.copy(hits[0].point).addScaledVector(up, EYE_HEIGHT);
        }
      }

      // ── update camera position and orientation ──
      // camera goes where the universe-space position is, but offset by universe group translation
      if (universeRef?.current) {
        camera.position
          .copy(surfacePos.current)
          .add(universeRef.current.position);
      } else {
        camera.position.copy(surfacePos.current);
      }

      // build camera quaternion from terrain-up + yaw/pitch
      // base orientation: align Y with terrain up
      const baseQ = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        up
      );
      // yaw around terrain up
      const yawQ = new THREE.Quaternion().setFromAxisAngle(up, surfaceYaw.current);
      // pitch around local right
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(baseQ).applyQuaternion(yawQ);
      const pitchQ = new THREE.Quaternion().setFromAxisAngle(right, surfacePitch.current);

      camera.quaternion.copy(pitchQ).multiply(yawQ).multiply(baseQ);

      // broadcast zero velocity in surface mode
      if (shipVelocityRef?.current) {
        shipVelocityRef.current.set(0, 0, 0);
      }

      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚀 HELM MODE — you are the ship
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (modeRef.current === "helm") {
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
      const thrust = new THREE.Vector3();

      if (keys.current.has("KeyW")) thrust.z -= 1;
      if (keys.current.has("KeyS")) thrust.z += 1;
      if (keys.current.has("KeyA")) thrust.x -= 1;
      if (keys.current.has("KeyD")) thrust.x += 1;

      if (virtualKeys?.current) {
        if (virtualKeys.current.has("KeyW")) thrust.z -= 1;
        if (virtualKeys.current.has("KeyS")) thrust.z += 1;
        if (virtualKeys.current.has("KeyA")) thrust.x -= 1;
        if (virtualKeys.current.has("KeyD")) thrust.x += 1;
      }

      if (joystick?.current) {
        thrust.x += joystick.current.x;
        thrust.z += joystick.current.z;
      }

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
            // trying to thrust into the ground — remove that component
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

        // if landed, cancel gravity (terrain supports the ship)
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
        _rayOrigin.copy(_rayDir).negate().multiplyScalar(2); // start from slightly above ship center
        _raycaster.set(_rayOrigin, _rayDir);
        _raycaster.far = 100;

        const hits = _raycaster.intersectObject(terrainMesh, false);
        if (hits.length > 0) {
          const hitDist = hits[0].distance;
          // hitDist is from rayOrigin to the surface
          // we started 2 units above ship center, so terrain distance = hitDist - 2
          const terrainDist = hitDist - 2;

          if (terrainDist < LANDING_HEIGHT) {
            /*
             * 🛬 Contact! Push the ship back up.
             *
             * Kill radial velocity (the component toward the planet).
             * Push ship position outward so it hovers at LANDING_HEIGHT.
             * If velocity is nearly zero → we're landed.
             */
            const upDir = _rayDir.clone().negate(); // away from planet
            const radialSpeed = shipVelocity.current.dot(_rayDir);
            if (radialSpeed > 0) {
              // remove inward velocity
              shipVelocity.current.addScaledVector(_rayDir, -radialSpeed);
            }

            // push ship outward by the penetration amount
            const pushAmount = LANDING_HEIGHT - terrainDist;
            if (shipWorldPosRef.current) {
              shipWorldPosRef.current.addScaledVector(upDir, pushAmount);
            }

            // check if we're truly landed (velocity near zero)
            if (shipVelocity.current.lengthSq() < 0.5) {
              if (!landedRef.current) {
                setLanded(true);
              }
            }
          } else if (terrainDist > LANDING_HEIGHT + 2) {
            // we've taken off again
            if (landedRef.current) {
              setLanded(false);
            }
          }
        } else {
          // no terrain hit — we're flying free
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

      return;
    }

    // cabin mode = parked. zero out the velocity broadcast.
    if (shipVelocityRef?.current) {
      shipVelocityRef.current.set(0, 0, 0);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚶 CABIN MODE — classic WASD walk
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const direction = new THREE.Vector3();

    if (keys.current.has("KeyW")) direction.z -= 1;
    if (keys.current.has("KeyS")) direction.z += 1;
    if (keys.current.has("KeyA")) direction.x -= 1;
    if (keys.current.has("KeyD")) direction.x += 1;

    if (virtualKeys?.current) {
      if (virtualKeys.current.has("KeyW")) direction.z -= 1;
      if (virtualKeys.current.has("KeyS")) direction.z += 1;
      if (virtualKeys.current.has("KeyA")) direction.x -= 1;
      if (virtualKeys.current.has("KeyD")) direction.x += 1;
    }

    if (joystick?.current) {
      direction.x += joystick.current.x;
      direction.z += joystick.current.z;
    }

    if (direction.lengthSq() === 0) return;

    direction.clampLength(0, 1);

    const yaw = new THREE.Euler(0, euler.current.y, 0, "YXZ");
    direction.applyEuler(yaw);

    const speed = MOVE_SPEED * delta;

    const cockpitQ =
      cockpitRef?.current?.quaternion ?? new THREE.Quaternion();
    const cockpitP =
      cockpitRef?.current?.position ?? new THREE.Vector3();
    const cockpitQInv = cockpitQ.clone().invert();

    const localPos = camera.position
      .clone()
      .sub(cockpitP)
      .applyQuaternion(cockpitQInv);

    localPos.x += direction.x * speed;
    localPos.y += direction.y * speed;
    localPos.z += direction.z * speed;

    localPos.x = THREE.MathUtils.clamp(localPos.x, BOUNDS.x.min, BOUNDS.x.max);
    localPos.y = THREE.MathUtils.clamp(localPos.y, BOUNDS.y.min, BOUNDS.y.max);
    localPos.z = THREE.MathUtils.clamp(localPos.z, BOUNDS.z.min, BOUNDS.z.max);

    localPos.applyQuaternion(cockpitQ).add(cockpitP);
    camera.position.copy(localPos);
  });

  return null;
}

/* ─── Props at the bottom, as is tradition ─── */

interface CabinControlsProps {
  onLockChange?: (locked: boolean) => void;
  onControlModeChange?: (mode: ControlMode) => void;
  controlMode?: ControlMode;
  isMobile?: boolean;
  virtualKeys?: { current: Set<string> };
  joystick?: { current: { x: number; z: number } };
  universeRef?: React.RefObject<THREE.Group>;
  cockpitRef?: React.RefObject<THREE.Group>;
  shipWorldPosRef?: React.RefObject<THREE.Vector3>;
  shipVelocityRef?: React.RefObject<THREE.Vector3>;
  terrainMeshRef?: React.RefObject<THREE.Mesh | null>;
  onLandedChange?: (landed: boolean) => void;
}
