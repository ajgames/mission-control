import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  TERRAIN_SIZE,
  TERRAIN_SEGMENTS,
  MAX_HEIGHT,
  TREE_COUNT,
  ROCK_COUNT,
  getTerrainHeight,
  fractalNoise2D,
} from "~/utils/terrainNoise";
import {
  PLANET_LOCAL_POS,
  PLANET_RADIUS,
  getDistanceToSurface,
  TERRAIN_APPEAR_DIST,
  TERRAIN_OPAQUE_DIST,
} from "~/utils/grandnessEffect";

/*
 * 🌍→🌲 The Terrain
 * ────────────────────────────────────────────
 * The non-Euclidean sleight of hand.
 *
 * At distance, you see a sphere — a marble on velvet.
 * Fly closer. The grandness effect flattens her curvature.
 * And then... this component wakes up.
 *
 * A 500×500 plane, tangent to the sphere's surface,
 * facing your ship like a welcome mat from the gods.
 * Noise-displaced vertices form mountains and valleys.
 * Instanced trees and rocks populate the landscape.
 *
 * The sphere never becomes a plane.
 * The plane just appears WHERE the sphere was flat.
 * Like a magician revealing that the card was in
 * your pocket the whole time.
 *
 *       sphere       ship
 *         ╱            │
 *    ╱▒▒▒▒▒▒╲   ←terrain→  🚀
 *   │▒▒▒▒▒▒▒▒│         │
 *   │▒▒▒▒▒▒▒▒│    d ≈ 8su
 *    ╲▒▒▒▒▒▒╱
 *
 *   "What you see isn't the sphere becoming flat.
 *    It's the flat revealing itself."
 */

// ── reusable math objects (no allocations in the frame loop) ──
const _dirToShip = new THREE.Vector3();
const _tangentPoint = new THREE.Vector3();
const _upVector = new THREE.Vector3(0, 1, 0);

export function Terrain({
  shipWorldPosRef,
  onTerrainMeshReady,
}: TerrainProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
  const treeMeshRef = useRef<THREE.InstancedMesh>(null!);
  const rockMeshRef = useRef<THREE.InstancedMesh>(null!);

  // track the UV offset for terrain regeneration when orbiting
  const lastUV = useRef({ u: 0, v: 0 });
  const currentUV = useRef({ u: 0, v: 0 });

  // ── build the geometry once, displace vertices with noise ──
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      TERRAIN_SEGMENTS,
      TERRAIN_SEGMENTS
    );

    // plane starts in XY — rotate to XZ (Y-up) so we can displace Y
    geo.rotateX(-Math.PI / 2);

    displaceVertices(geo, 0, 0);

    return geo;
  }, []);

  /*
   * 🌲 Instanced trees — 600 cones scattered across the lowlands
   *
   * Not every mountain needs a tree. But every valley does.
   * Placed where height is between 0.5 and 3.0 — the sweet spot
   * between "too wet" and "too rocky." Nature's Goldilocks zone.
   *
   * Each tree gets a random Y rotation and scale variation
   * so they look like a forest, not a Christmas tree farm.
   */
  const treeData = useMemo(() => generateTreePositions(0, 0), []);
  const rockData = useMemo(() => generateRockPositions(0, 0), []);

  // populate instanced meshes on mount
  useEffect(() => {
    if (treeMeshRef.current) {
      populateInstances(treeMeshRef.current, treeData);
    }
    if (rockMeshRef.current) {
      populateInstances(rockMeshRef.current, rockData);
    }
  }, [treeData, rockData]);

  // report the mesh ref up to Scene → CabinControls for raycasting
  useEffect(() => {
    if (meshRef.current && onTerrainMeshReady) {
      onTerrainMeshReady(meshRef.current);
    }
  }, [onTerrainMeshReady]);

  useFrame(() => {
    if (!shipWorldPosRef?.current) return;

    const shipPos = shipWorldPosRef.current;
    const surfDist = getDistanceToSurface(shipPos);

    // ── visibility and opacity based on distance ──
    if (surfDist > TERRAIN_APPEAR_DIST) {
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;

    // fade opacity: 0 at APPEAR, 1 at OPAQUE
    const t = Math.max(
      0,
      Math.min(
        1,
        (TERRAIN_APPEAR_DIST - surfDist) /
          (TERRAIN_APPEAR_DIST - TERRAIN_OPAQUE_DIST)
      )
    );
    if (materialRef.current) {
      materialRef.current.opacity = t;
    }

    // ── position the terrain tangent to the sphere ──
    // find the closest point on the sphere to the ship
    _dirToShip
      .copy(shipPos)
      .sub(PLANET_LOCAL_POS)
      .normalize();

    _tangentPoint
      .copy(PLANET_LOCAL_POS)
      .addScaledVector(_dirToShip, PLANET_RADIUS);

    // the terrain lives in universe-space (pre-transform),
    // so position it directly at the tangent point
    groupRef.current.position.copy(_tangentPoint);

    // orient so local Y+ points toward the ship (away from planet center)
    groupRef.current.quaternion.setFromUnitVectors(_upVector, _dirToShip);

    // ── terrain regeneration — different geography per region ──
    // compute spherical UV from the direction to ship
    const u = Math.atan2(_dirToShip.x, _dirToShip.z) / (2 * Math.PI) + 0.5;
    const v = Math.asin(Math.max(-1, Math.min(1, _dirToShip.y))) / Math.PI + 0.5;
    currentUV.current = { u, v };

    const du = Math.abs(u - lastUV.current.u);
    const dv = Math.abs(v - lastUV.current.v);

    // if the ship has orbited significantly, regenerate the terrain
    if (du > 0.1 || dv > 0.1) {
      lastUV.current = { u, v };
      displaceVertices(geometry, u, v);
      meshRef.current.geometry = geometry;

      // regenerate vegetation for new region
      const newTrees = generateTreePositions(u, v);
      const newRocks = generateRockPositions(u, v);
      if (treeMeshRef.current) populateInstances(treeMeshRef.current, newTrees);
      if (rockMeshRef.current) populateInstances(rockMeshRef.current, newRocks);
    }
  });

  /*
   * 🌫️ Atmospheric fog — the horizon dissolves into haze
   *
   * Without this, the terrain is a 500×500 postage stamp
   * floating in the void. WITH this, the edges fade into
   * a blue-grey atmosphere that matches the planet's glow.
   *
   * The fog is injected via onBeforeCompile — we splice
   * distance-based color blending into the fragment shader.
   * Far terrain fragments lerp toward the atmosphere color.
   * The result: the ground appears to extend to infinity.
   *
   * You can't see where the terrain ends because
   * the atmosphere swallowed the evidence.
   *
   *   near ████████████████░░░░░░░░ far
   *        ▲ sharp detail  ▲ haze
   *
   *   "What lies beyond the horizon?"
   *   "More horizon. Always more horizon."
   */
  const fogMaterialProps = useMemo(() => ({
    onBeforeCompile: (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uFogColor = { value: new THREE.Color("#6b8dad") };
      shader.uniforms.uFogNear = { value: 60.0 };
      shader.uniforms.uFogFar = { value: 220.0 };

      // inject varying into vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
         varying float vFogDist;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <fog_vertex>",
        `#include <fog_vertex>
         vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
         vFogDist = length(mvPos.xyz);`
      );

      // inject fog blending into fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
         uniform vec3 uFogColor;
         uniform float uFogNear;
         uniform float uFogFar;
         varying float vFogDist;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         float fogFactor = smoothstep(uFogNear, uFogFar, vFogDist);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);`
      );
    },
  }), []);

  return (
    <group ref={groupRef} visible={false}>
      {/* the ground itself — noise-displaced plane with atmospheric haze */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow>
        <meshStandardMaterial
          ref={materialRef}
          color="#3a6b2a"
          roughness={0.92}
          transparent
          opacity={0}
          depthWrite
          side={THREE.DoubleSide}
          {...fogMaterialProps}
        />
      </mesh>

      {/*
       * 🌲 Trees — instanced cones, because real trees are just
       * cones with better marketing.
       *
       * 600 instances, each uniquely scaled and rotated.
       * The GPU doesn't even break a sweat.
       */}
      <instancedMesh
        ref={treeMeshRef}
        args={[undefined, undefined, TREE_COUNT]}
        castShadow
      >
        <coneGeometry args={[1.2, 4, 6]} />
        <meshStandardMaterial color="#2d5a1e" roughness={0.9} />
      </instancedMesh>

      {/*
       * 🪨 Rocks — instanced dodecahedrons, because nature
       * doesn't do cubes (that's Minecraft's job).
       *
       * 300 instances scattered on high ground and sparse
       * random patches in the lowlands. Angular, brooding,
       * the introverts of the terrain.
       */}
      <instancedMesh
        ref={rockMeshRef}
        args={[undefined, undefined, ROCK_COUNT]}
        castShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5a5045" roughness={0.95} />
      </instancedMesh>
    </group>
  );
}

/*
 * ── Helper functions — the backstage crew ──
 *
 * These do the heavy lifting so the component
 * can focus on looking pretty. Like roadies
 * at a rock concert: essential, invisible, underpaid.
 */

/** Displace plane vertices using fractal noise */
function displaceVertices(
  geo: THREE.PlaneGeometry,
  uvU: number,
  uvV: number
) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getTerrainHeight(x, z, uvU, uvV);
    pos.setY(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

/** Generate seeded tree positions on the terrain */
function generateTreePositions(
  uvU: number,
  uvV: number
): { matrix: THREE.Matrix4 }[] {
  const rng = mulberry32(42 + 5000 + Math.floor(uvU * 100) + Math.floor(uvV * 100) * 1000);
  const half = TERRAIN_SIZE / 2;
  const instances: { matrix: THREE.Matrix4 }[] = [];
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  let placed = 0;
  let attempts = 0;
  const maxAttempts = TREE_COUNT * 4;

  while (placed < TREE_COUNT && attempts < maxAttempts) {
    attempts++;
    const x = (rng() - 0.5) * TERRAIN_SIZE * 0.85; // stay away from edges
    const z = (rng() - 0.5) * TERRAIN_SIZE * 0.85;
    const h = getTerrainHeight(x, z, uvU, uvV);

    // trees grow in the lowlands/midlands — not in the flats, not on peaks
    if (h < 0.5 || h > 3.5) continue;

    // use secondary noise as density threshold — clumping, not uniform
    const density = fractalNoise2D(x * 0.02 + uvU * 10, z * 0.02 + uvV * 10, 42 + 6000, 2);
    if (density < 0.35) continue;

    const s = 0.6 + rng() * 0.8; // scale variation
    pos.set(x, h + s * 2, z); // trunk base at terrain height, offset up by half cone height
    quat.setFromAxisAngle(_upVector, rng() * Math.PI * 2);
    scale.set(s, s, s);
    mat.compose(pos, quat, scale);
    instances.push({ matrix: mat.clone() });
    placed++;
  }

  return instances;
}

/** Generate seeded rock positions on the terrain */
function generateRockPositions(
  uvU: number,
  uvV: number
): { matrix: THREE.Matrix4 }[] {
  const rng = mulberry32(42 + 7000 + Math.floor(uvU * 100) + Math.floor(uvV * 100) * 1000);
  const instances: { matrix: THREE.Matrix4 }[] = [];
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  let placed = 0;
  let attempts = 0;
  const maxAttempts = ROCK_COUNT * 4;

  while (placed < ROCK_COUNT && attempts < maxAttempts) {
    attempts++;
    const x = (rng() - 0.5) * TERRAIN_SIZE * 0.85;
    const z = (rng() - 0.5) * TERRAIN_SIZE * 0.85;
    const h = getTerrainHeight(x, z, uvU, uvV);

    // rocks on mountains (h > 2.5) + sparse scatter everywhere
    const isHighGround = h > 2.5;
    if (!isHighGround && rng() > 0.15) continue;
    if (h < 0.1) continue;

    // non-uniform scale for angular variety — rocks aren't spheres
    const sx = 0.4 + rng() * 1.0;
    const sy = 0.3 + rng() * 0.8;
    const sz = 0.4 + rng() * 1.0;
    pos.set(x, h + sy * 0.3, z); // partially buried
    quat.setFromEuler(
      new THREE.Euler(rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5)
    );
    scale.set(sx, sy, sz);
    mat.compose(pos, quat, scale);
    instances.push({ matrix: mat.clone() });
    placed++;
  }

  return instances;
}

/** Populate an InstancedMesh with pre-computed matrices */
function populateInstances(
  mesh: THREE.InstancedMesh,
  data: { matrix: THREE.Matrix4 }[]
) {
  // hide all instances first
  const hideMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < mesh.count; i++) {
    mesh.setMatrixAt(i, hideMatrix);
  }

  // place the ones we have
  for (let i = 0; i < data.length && i < mesh.count; i++) {
    mesh.setMatrixAt(i, data[i].matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
}

import { mulberry32 } from "~/utils/prng";

/* ─── Props at the bottom, as is tradition ─── */

interface TerrainProps {
  shipWorldPosRef?: React.RefObject<THREE.Vector3>;
  onTerrainMeshReady?: (mesh: THREE.Mesh) => void;
}
