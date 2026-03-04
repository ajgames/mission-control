import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🎮 Cabin Controls — now with HELM MODE
 * ────────────────────────────────────────────
 * Two lives in one component:
 *
 * 🚶 CABIN MODE (default)
 *   Click to lock. WASD to wander. Mouse to look.
 *   You're a person in a tin can. Walls are real.
 *
 * 🚀 HELM MODE (press E)
 *   The camera snaps forward. You ARE the ship now.
 *
 *   WASD = thrust & strafe (with inertia — Newton's first!)
 *   Mouse = pitch & roll (because yaw is for amateurs)
 *   ESC or E = back to being a person
 *
 *   The Gemini is a gravity ship — six thruster arrays
 *   on every face, each one a swirling vortex of cyan.
 *   Movement has weight. Stopping takes effort.
 *   Every course correction costs momentum.
 *
 *        ┌─────────────────────────┐
 *        │    W = forward thrust   │
 *        │    S = reverse thrust   │
 *        │    A = strafe port      │
 *        │    D = strafe starboard │
 *        │                         │
 *        │    🖱️ X = roll          │
 *        │    🖱️ Y = pitch         │
 *        │    ESC / E = disengage  │
 *        └─────────────────────────┘
 *
 *   "She doesn't handle like a fighter.
 *    She handles like a cathedral that learned to fly."
 *
 * Also supports mobile:
 *   📱 D-pad / joystick for movement, touch-drag for look.
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
// she's heavy. she drifts. she remembers where she was going.
const HELM_THRUST = 14;
const HELM_STRAFE = 12;
const HELM_DRAG = 0.985; // velocity decays each frame — friction of the void
const HELM_PITCH_SPEED = 0.0015;
const HELM_ROLL_SPEED = 0.002;
const HELM_ANGULAR_DRAG = 0.93; // rotational dampening — gyroscopes humming

// the viewport seat — where the camera snaps when you take the helm
const HELM_POSITION = new THREE.Vector3(0, 0.2, -7.5);

export function CabinControls({
  onLockChange,
  onNavModeChange,
  navMode,
  isMobile = false,
  virtualKeys,
  joystick,
  universeRef,
}: CabinControlsProps) {
  const { camera, gl } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const keys = useRef<Set<string>>(new Set());
  const isLocked = useRef(false);

  // touch tracking for mobile camera look
  const activeTouchId = useRef<number | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);

  // ── helm state — the ship's memory ──
  const helmActive = useRef(false);
  const shipVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const shipWorldPos = useRef(new THREE.Vector3(0, 0, 0)); // accumulated world offset
  const angularVelocity = useRef({ pitch: 0, roll: 0 });
  const shipQuaternion = useRef(new THREE.Quaternion());
  const savedCameraPos = useRef(new THREE.Vector3());
  const savedCameraQuat = useRef(new THREE.Quaternion());

  // sync external nav mode → internal ref
  useEffect(() => {
    helmActive.current = !!navMode;
  }, [navMode]);

  // 📱 on mobile, auto-engage — no cursor to lock, just vibes
  useEffect(() => {
    if (isMobile) {
      isLocked.current = true;
      onLockChange?.(true);
    }
  }, [isMobile, onLockChange]);

  const enterHelm = useCallback(() => {
    if (helmActive.current) return;

    // 📸 save where the crew member was standing
    savedCameraPos.current.copy(camera.position);
    savedCameraQuat.current.copy(camera.quaternion);

    // snap to the viewport seat, look straight out into the black
    camera.position.copy(HELM_POSITION);
    const lookTarget = HELM_POSITION.clone().add(new THREE.Vector3(0, 0, -1));
    camera.lookAt(lookTarget);
    shipQuaternion.current.copy(camera.quaternion);

    // reset velocities — clean slate, clean conscience
    shipVelocity.current.set(0, 0, 0);
    angularVelocity.current = { pitch: 0, roll: 0 };

    helmActive.current = true;
    onNavModeChange?.(true);
  }, [camera, onNavModeChange]);

  const exitHelm = useCallback(() => {
    if (!helmActive.current) return;

    // return the camera to where the crew member was standing
    camera.position.copy(savedCameraPos.current);
    camera.quaternion.copy(savedCameraQuat.current);
    euler.current.setFromQuaternion(camera.quaternion);

    // reset the universe back to origin — the ship stops here
    if (universeRef?.current) {
      universeRef.current.position.set(0, 0, 0);
    }
    shipWorldPos.current.set(0, 0, 0);

    helmActive.current = false;
    onNavModeChange?.(false);
  }, [camera, onNavModeChange, universeRef]);

  /* ─── Desktop: mouse look ─── */
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isLocked.current) return;

      if (helmActive.current) {
        /*
         * 🎯 Helm mouse — pitch & roll
         * Mouse-Y → pitch (nose up/down)
         * Mouse-X → roll (barrel roll, baby)
         *
         * We accumulate angular velocity rather than setting
         * orientation directly. The ship resists, then complies.
         */
        angularVelocity.current.pitch -= e.movementY * HELM_PITCH_SPEED;
        angularVelocity.current.roll -= e.movementX * HELM_ROLL_SPEED;
        return;
      }

      // cabin mode — normal mouselook
      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY;
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY;
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );
      camera.quaternion.setFromEuler(euler.current);
    },
    [camera]
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      keys.current.add(e.code);

      // 🔑 E = toggle the helm
      if (e.code === "KeyE" && isLocked.current) {
        if (helmActive.current) {
          exitHelm();
        } else {
          enterHelm();
        }
      }
    },
    [enterHelm, exitHelm]
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    keys.current.delete(e.code);
  }, []);

  const onPointerLockChange = useCallback(() => {
    const wasLocked = isLocked.current;
    isLocked.current = document.pointerLockElement === gl.domElement;
    onLockChange?.(isLocked.current);

    // if pointer lock was lost while helming, exit helm too
    if (wasLocked && !isLocked.current && helmActive.current) {
      exitHelm();
    }
  }, [gl.domElement, onLockChange, exitHelm]);

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

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= dx * TOUCH_SENSITIVITY;
      euler.current.x -= dy * TOUCH_SENSITIVITY;
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );
      camera.quaternion.setFromEuler(euler.current);
    },
    [isMobile, camera]
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

  /* ─── Frame loop ─── */
  useFrame((_, delta) => {
    if (!isLocked.current) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚀 HELM MODE — you are the ship
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (helmActive.current) {
      /*
       * Gravity ship physics loop:
       *   1. Accumulate angular velocity → rotate ship
       *   2. Read thrust → accelerate in ship-local space
       *   3. Apply drag → the void has friction (handwavium)
       *   4. Integrate position
       *
       * She feels heavy but responsive. Push the stick,
       * wait for her to answer, then feel her commit.
       */
      const dt = Math.min(delta, 0.05); // cap to prevent physics explosions on tab-switch

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

      // damp angular velocity — gyro stabilizers humming
      const angDrag = Math.pow(HELM_ANGULAR_DRAG, dt * 60);
      angularVelocity.current.pitch *= angDrag;
      angularVelocity.current.roll *= angDrag;

      // kill micro-drift — the ship comes to rest
      if (Math.abs(angularVelocity.current.pitch) < 0.00005)
        angularVelocity.current.pitch = 0;
      if (Math.abs(angularVelocity.current.roll) < 0.00005)
        angularVelocity.current.roll = 0;

      // ── 2. thrust → acceleration ──
      const thrust = new THREE.Vector3();
      if (keys.current.has("KeyW")) thrust.z -= 1; // forward
      if (keys.current.has("KeyS")) thrust.z += 1; // reverse
      if (keys.current.has("KeyA")) thrust.x -= 1; // port
      if (keys.current.has("KeyD")) thrust.x += 1; // starboard

      if (thrust.lengthSq() > 0) {
        thrust.normalize();
        // rotate thrust into ship's reference frame
        thrust.applyQuaternion(shipQuaternion.current);

        const mag = Math.abs(thrust.z) > 0.5 ? HELM_THRUST : HELM_STRAFE;
        shipVelocity.current.addScaledVector(thrust, mag * dt);
      }

      // ── 3. drag — nothing moves forever ──
      const linDrag = Math.pow(HELM_DRAG, dt * 60);
      shipVelocity.current.multiplyScalar(linDrag);

      if (shipVelocity.current.lengthSq() < 0.0001) {
        shipVelocity.current.set(0, 0, 0);
      }

      // ── 4. integrate position ──
      // the ship stays at origin — the universe moves around it
      // camera is pinned to the helm seat, looking out
      camera.position.copy(HELM_POSITION);
      shipWorldPos.current.addScaledVector(shipVelocity.current, dt);

      if (universeRef?.current) {
        // universe slides opposite to where the ship is heading
        universeRef.current.position.set(
          -shipWorldPos.current.x,
          -shipWorldPos.current.y,
          -shipWorldPos.current.z
        );
      }

      return;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🚶 CABIN MODE — classic WASD walk
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const direction = new THREE.Vector3();

    if (keys.current.has("KeyW")) direction.z -= 1;
    if (keys.current.has("KeyS")) direction.z += 1;
    if (keys.current.has("KeyA")) direction.x -= 1;
    if (keys.current.has("KeyD")) direction.x += 1;

    // virtual keys (D-pad buttons)
    if (virtualKeys?.current) {
      if (virtualKeys.current.has("KeyW")) direction.z -= 1;
      if (virtualKeys.current.has("KeyS")) direction.z += 1;
      if (virtualKeys.current.has("KeyA")) direction.x -= 1;
      if (virtualKeys.current.has("KeyD")) direction.x += 1;
    }

    // joystick (analog — preserves partial deflection for finesse)
    if (joystick?.current) {
      direction.x += joystick.current.x;
      direction.z += joystick.current.z;
    }

    if (direction.lengthSq() === 0) return;

    direction.clampLength(0, 1);

    // rotate movement to match camera facing (stay level)
    const yaw = new THREE.Euler(0, euler.current.y, 0, "YXZ");
    direction.applyEuler(yaw);

    const speed = MOVE_SPEED * delta;
    camera.position.x += direction.x * speed;
    camera.position.y += direction.y * speed;
    camera.position.z += direction.z * speed;

    // clamp to cabin boundaries — the walls are real even if the stars aren't
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      BOUNDS.x.min,
      BOUNDS.x.max
    );
    camera.position.y = THREE.MathUtils.clamp(
      camera.position.y,
      BOUNDS.y.min,
      BOUNDS.y.max
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      BOUNDS.z.min,
      BOUNDS.z.max
    );
  });

  // this component is invisible — it's all behavior, no geometry
  return null;
}

/* ─── Props at the bottom, as is tradition ─── */

interface CabinControlsProps {
  onLockChange?: (locked: boolean) => void;
  onNavModeChange?: (navMode: boolean) => void;
  navMode?: boolean;
  isMobile?: boolean;
  virtualKeys?: { current: Set<string> };
  joystick?: { current: { x: number; z: number } };
  universeRef?: React.RefObject<THREE.Group>;
}
