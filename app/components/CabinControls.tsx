import { useRef, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🎮 Cabin Controls
 * ────────────────────────────────────────────
 * Click to lock. WASD to wander. Mouse to look.
 * ESC to return to the mundane world of cursors.
 *
 * You're floating in a tin can, far above the world.
 * Planet Earth (well, some planet) is blue,
 * and there's nothing you can do.
 *
 *    ┌─────────────────────────┐
 *    │        W (forward)      │
 *    │   A (left)  D (right)   │
 *    │        S (back)         │
 *    │                         │
 *    │   🖱️ mouse = look       │
 *    │   ESC = unlock          │
 *    └─────────────────────────┘
 *
 * Movement is clamped to the cabin interior
 * because walking through walls is a feature
 * reserved for ghosts and QA testers.
 */

// cabin boundaries — stay inside the tin can
// cabin boundaries — the floor is at -5, head clearance at 5.5
const BOUNDS = {
  x: { min: -10, max: 10 },
  y: { min: -3, max: 5 },
  z: { min: -9, max: 6 },
};

const MOVE_SPEED = 5;
const MOUSE_SENSITIVITY = 0.002;

export function CabinControls({
  onLockChange,
}: {
  onLockChange?: (locked: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const keys = useRef<Set<string>>(new Set());
  const isLocked = useRef(false);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isLocked.current) return;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY;
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY;

      // clamp vertical look so you can't do a full backflip in the chair
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );

      camera.quaternion.setFromEuler(euler.current);
    },
    [camera]
  );

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    keys.current.add(e.code);
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    keys.current.delete(e.code);
  }, []);

  const onPointerLockChange = useCallback(() => {
    isLocked.current = document.pointerLockElement === gl.domElement;
    onLockChange?.(isLocked.current);
  }, [gl.domElement, onLockChange]);

  const onClick = useCallback(() => {
    if (!isLocked.current) {
      gl.domElement.requestPointerLock();
    }
  }, [gl.domElement]);

  useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [gl.domElement, onClick, onMouseMove, onPointerLockChange, onKeyDown, onKeyUp]);

  useFrame((_, delta) => {
    if (!isLocked.current) return;

    // build a movement vector from pressed keys
    const direction = new THREE.Vector3();

    if (keys.current.has("KeyW")) direction.z -= 1;
    if (keys.current.has("KeyS")) direction.z += 1;
    if (keys.current.has("KeyA")) direction.x -= 1;
    if (keys.current.has("KeyD")) direction.x += 1;

    if (direction.lengthSq() === 0) return;

    direction.normalize();

    // rotate movement to match where the camera is looking (but stay level — no flying)
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
