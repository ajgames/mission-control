import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLANET_LOCAL_POS } from "~/utils/grandnessEffect";
import { useHelmPhysics, HELM_POSITION, HELM_PITCH_SPEED, HELM_ROLL_SPEED } from "~/hooks/useHelmPhysics";
import { useSurfacePhysics } from "~/hooks/useSurfacePhysics";
import type { ControlMode } from "./Scene";

/*
 * 🎮 Cabin Controls — the switchboard
 * ────────────────────────────────────────────
 * Three modes, one component, zero tolerance for jank.
 *
 * 🚶 CABIN MODE  — WASD walking, mouse looking, tin-can walls
 * 🚀 HELM MODE   — orbital flight physics (delegated to useHelmPhysics)
 * 🌍 SURFACE MODE — terrain walking (delegated to useSurfacePhysics)
 *
 * This file handles: mode transitions, input wiring, event
 * listeners, and cabin-mode movement. The heavy physics
 * live in their own hooks now — cleaner code, same vibes.
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

/*
 * 🕹️ gatherMovementInput — the universal WASD reader
 *
 * All three modes need the same raw input: W/S/A/D from
 * keyboard, virtual buttons, and joystick. This gathers
 * it into a single Vector3 so each mode can transform
 * it however it likes.
 *
 *   z < 0 = forward (W)   z > 0 = backward (S)
 *   x < 0 = left (A)      x > 0 = right (D)
 */
function gatherMovementInput(
  keys: React.RefObject<Set<string>>,
  virtualKeys?: { current: Set<string> },
  joystick?: { current: { x: number; z: number } }
): THREE.Vector3 {
  const dir = new THREE.Vector3();

  if (keys.current.has("KeyW")) dir.z -= 1;
  if (keys.current.has("KeyS")) dir.z += 1;
  if (keys.current.has("KeyA")) dir.x -= 1;
  if (keys.current.has("KeyD")) dir.x += 1;

  if (virtualKeys?.current) {
    if (virtualKeys.current.has("KeyW")) dir.z -= 1;
    if (virtualKeys.current.has("KeyS")) dir.z += 1;
    if (virtualKeys.current.has("KeyA")) dir.x -= 1;
    if (virtualKeys.current.has("KeyD")) dir.x += 1;
  }

  if (joystick?.current) {
    dir.x += joystick.current.x;
    dir.z += joystick.current.z;
  }

  return dir;
}

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
  const surfacePos = useRef(new THREE.Vector3());
  const surfaceYaw = useRef(0);
  const surfacePitch = useRef(0);
  const terrainUpRef = useRef(new THREE.Vector3(0, 1, 0));
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
   */
  const enterSurface = useCallback(() => {
    if (modeRef.current !== "helm" || !landedRef.current) return;

    if (shipWorldPosRef?.current) {
      terrainUpRef.current
        .copy(shipWorldPosRef.current)
        .sub(PLANET_LOCAL_POS)
        .normalize();
    }

    if (shipWorldPosRef?.current) {
      shipLandingPos.current.copy(shipWorldPosRef.current);
    }

    surfacePos.current.set(0, 0, 0);
    if (shipWorldPosRef?.current) {
      surfacePos.current.copy(shipWorldPosRef.current);
    }

    const shipFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuaternion.current);
    const up = terrainUpRef.current;
    const projected = shipFwd.clone().addScaledVector(up, -shipFwd.dot(up)).normalize();
    surfaceYaw.current = Math.atan2(projected.x, projected.z);
    surfacePitch.current = 0;

    shipVelocity.current.set(0, 0, 0);
    angularVelocity.current = { pitch: 0, roll: 0 };

    setMode("surface");
  }, [camera, shipWorldPosRef, setMode]);

  /*
   * 🚀 exitSurface — back to the tin can
   */
  const exitSurface = useCallback(() => {
    if (modeRef.current !== "surface") return;

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

  // 🕹️ shared input gatherer — passed to both physics hooks
  const gatherInput = useCallback(
    () => gatherMovementInput(keys, virtualKeys, joystick),
    [virtualKeys, joystick]
  );

  // ── delegate physics to specialized hooks ──
  useHelmPhysics({
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
  });

  useSurfacePhysics({
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
  });

  /* ─── Frame loop — mobile buttons + cabin mode only ─── */
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

    // helm and surface handled by their own hooks
    if (modeRef.current !== "cabin") return;

    // cabin mode = parked. zero out the velocity broadcast.
    if (shipVelocityRef?.current) {
      shipVelocityRef.current.set(0, 0, 0);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚶 CABIN MODE — classic WASD walk
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const direction = gatherInput();

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
