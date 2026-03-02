import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * 🪐 The Planet
 * ────────────────────────────────────────────
 * Sitting there in the viewport like a marble
 * someone left on a black velvet cloth.
 *
 * She rotates slowly. She doesn't care about
 * your deadlines or your sprint retro.
 * She was here before you and she'll be here after.
 *
 * The atmosphere shader gives her that thin blue halo —
 * fragile, like everything worth protecting.
 */

export function Planet() {
  const planetRef = useRef<THREE.Mesh>(null!);
  const cloudsRef = useRef<THREE.Mesh>(null!);
  const atmosphereRef = useRef<THREE.Mesh>(null!);

  // procedural surface texture via canvas
  const surfaceTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    // base ocean color
    ctx.fillStyle = "#1a4a7a";
    ctx.fillRect(0, 0, 512, 256);

    // land masses — little continents scattered like dreams
    const landColors = ["#2d5a1e", "#3a6b2a", "#4a7a35", "#5a8a45"];
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = landColors[Math.floor(Math.random() * landColors.length)];
      ctx.beginPath();
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const rx = 15 + Math.random() * 40;
      const ry = 10 + Math.random() * 25;
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // ice caps — cold but photogenic
    ctx.fillStyle = "#ddeeff";
    ctx.fillRect(0, 0, 512, 18);
    ctx.fillRect(0, 238, 512, 18);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const cloudTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(255, 255, 255, 0.0)";
    ctx.fillRect(0, 0, 512, 256);

    // wispy cloud patches
    for (let i = 0; i < 80; i++) {
      const alpha = 0.1 + Math.random() * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const rx = 20 + Math.random() * 60;
      const ry = 8 + Math.random() * 20;
      ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  useFrame((_, delta) => {
    // planet rotates like she's got nowhere to be
    planetRef.current.rotation.y += delta * 0.03;
    cloudsRef.current.rotation.y += delta * 0.04;
    atmosphereRef.current.rotation.y += delta * 0.01;
  });

  return (
    <group position={[30, 5, -120]}>
      {/* the planet herself */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[40, 64, 64]} />
        <meshStandardMaterial map={surfaceTexture} roughness={0.8} />
      </mesh>

      {/* cloud layer — slightly larger, slightly mysterious */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[40.3, 64, 64]} />
        <meshStandardMaterial
          map={cloudTexture}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* atmosphere glow — the thin blue line */}
      <mesh ref={atmosphereRef} scale={[1.08, 1.08, 1.08]}>
        <sphereGeometry args={[40, 64, 64]} />
        <meshBasicMaterial
          color="#4a90d9"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
