
import { useRef, useState, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MachinePosition } from '@/types';
import { useLineStore } from '@/store/useLineStore';

interface Machine3DProps {
  machineData: MachinePosition;
}

// Maps machine keys (lowercase) to GLB filenames
const MODEL_MAP: Record<string, string> = {
  // Sewing Family
  snls: 'snls.glb',
  dnls: 'snls.glb', // Double needle looks similar for layout purposes

  // Overlock / SNEC Family
  snec: 'snls.glb', // User Requested: SNEC uses SNLS model
  overlock: '3t ol.glb',
  ol: '3t ol.glb',
  '3t': '3t ol.glb',

  // Specialty
  foa: 'FOA.glb', // Feed Off Arm
  label: 'labelattaching.glb',
  attach: 'labelattaching.glb',
  wrapping: 'wrapping.glb',
  wrap: 'wrapping.glb',

  // Specifics
  turning: 'turning mc.glb',
  pointing: 'pointing mc.glb',
  contour: 'contourmc.glb', // User Requested: contourmc.glb
  iron: 'iron press.glb',
  press: 'iron press.glb',

  // Button Family
  hole: 'buttonhole.glb',
  bhole: 'buttonhole.glb',
  bholemc: 'buttonhole.glb', // Explicit match for B/Hole M/C
  button: 'buttonmakinggg.glb',
  buttonmaking: 'buttonmakinggg.glb',

  // Others
  bartack: 'bartack.finalglb.glb',
  inspection: 'inspection machine final.glb',
  notch: 'notchmc.glb', // User Requested: Notch M/C uses notchmc.glb

  // Helpers
  supermarket: 'supermarket.glb',
  trolley: 'helpers table.glb',
  helper: 'helpers table.glb',
  'helper table': 'helpers table.glb', // Explicitly add helper table keyword
  fusing: 'fusing mc.glb',
  blocking: 'blocking mc.glb',

  // Default override
  default: 'last machine.glb'
};

const getModelUrl = (type: string) => {
  if (!type) return `/models/${MODEL_MAP['default']}`;

  const t = type.toLowerCase();

  // Clean string for easier matching
  const cleanType = t.replace(/[^a-z0-9]/g, '');

  for (const key of Object.keys(MODEL_MAP)) {
    if (t.includes(key) || cleanType.includes(key)) {
      return `/models/${MODEL_MAP[key]}`;
    }
  }
  return `/models/${MODEL_MAP['default']}`;
};

export const Machine3D = ({ machineData }: Machine3DProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  const { selectedMachine, setSelectedMachine, visibleSection } = useLineStore();
  const isSelected = selectedMachine?.id === machineData.id;

  // Visibility Logic
  const isVisible = !visibleSection || (machineData.section && machineData.section.toLowerCase() === visibleSection.toLowerCase());

  // Check if this is a Section Board
  if (machineData.operation.machine_type.toLowerCase().startsWith('board')) {

    if (!isVisible) return null;
    return (
      <group
        position={[machineData.position.x, machineData.position.y, machineData.position.z]}
        rotation={[machineData.rotation.x, machineData.rotation.y, machineData.rotation.z]}
      >
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.5]} />
          <meshStandardMaterial color="#333" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.5, 0.5, 0.1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <Text
          position={[0, 0, 0.06]}
          fontSize={0.2}
          color="#000000"
          anchorX="center"
          anchorY="middle"
        >
          {machineData.section}
        </Text>
      </group>
    );
  }

  // Check if this is a Pathway
  if (machineData.operation.machine_type.toLowerCase() === 'pathway') {
    if (!isVisible) return null;
    return (
      <group
        position={[machineData.position.x, 0.01, 0]} // Centered on Z=0, slightly above floor
        rotation={[0, 0, 0]}
      >
        {/* Walkway Strip: 2m wide along X, 15m long along Z */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 30]} />
          <meshStandardMaterial color="#666666" transparent opacity={0.4} />
        </mesh>
        {/* Borders */}
        <mesh position={[1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 30]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[-1, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 30]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      </group>
    );
  }

  const modelUrl = getModelUrl(machineData.operation.machine_type);

  // Handle Blank Space (Notch M/C)
  if (modelUrl === 'empty') return null;

  // Load model with error handling
  let scene;
  try {
    const gltf = useGLTF(modelUrl, true);
    scene = gltf.scene;
  } catch (error) {
    console.error(`Failed to load model: ${modelUrl}`, error);
    // Return a simple box as fallback
    return (
      <mesh
        position={[machineData.position.x, machineData.position.y, machineData.position.z]}
        rotation={[machineData.rotation.x, machineData.rotation.y, machineData.rotation.z]}
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    );
  }

  // Clone scene with memoization to prevent re-cloning every render
  const clonedScene = useMemo(() => scene ? scene.clone() : null, [scene]);

  // Handle centering logic once when model loads
  useLayoutEffect(() => {
    if (machineData.centerModel && clonedScene) {
      const box = new THREE.Box3().setFromObject(clonedScene);
      const center = box.getCenter(new THREE.Vector3());
      // Shift so the center X/Z aligns with local 0,0
      clonedScene.position.x = -center.x;
      clonedScene.position.z = -center.z;
    }
  }, [clonedScene, machineData.centerModel]);

  // Dynamic Scaling
  // Many industrial models are in MM or CM. ThreeJS is Meters.
  // If the model is huge, let's scale it down. 
  // A safe bet for these specific models (often raw exports) is 0.01 or 0.1.
  // User screenshot showed massive gray walls -> implies scale is like 100x or 1000x too big.
  // Let's try 0.1 first. If it's usually 1 unit = 1mm, then 0.001 is needed.
  // But let's start with 0.1 and we can adjust.
  // UPDATE: User says "set some other machine as default".
  // Note: We use 'last machine.glb' as default.

  const SCALE_FACTOR = 0.01; // Base scale for mm -> m

  // Model-specific scale overrides
  const MODEL_SCALES: Record<string, number> = {
    'buttonmakinggg.glb': 0.3,
    'buttonhole.glb': 0.3,
    'snls.glb': 1.0,
    'helpers table.glb': 1.0, // Scale for Helper Table
    'notchmc.glb': 1.0, // Updated to notchmc.glb
  };

  const getBaseScale = () => {
    const filename = modelUrl.split('/').pop() || '';
    const specificScale = MODEL_SCALES[filename] || 1.0;
    return SCALE_FACTOR * specificScale;
  };

  // Color override for selection/hover? 
  // With GLBs, it's harder to tint the whole model without traversing materials.
  // We will simply use an outline or indicator for selection.

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Scale animation
    const clickScale = clicked ? 0.9 : 1;
    const baseScale = getBaseScale();
    const finalScale = baseScale * clickScale;

    meshRef.current.scale.set(finalScale, finalScale, finalScale);

    // Hover effect
    const hoverY = hovered ? 0.1 : 0;
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      machineData.position.y + hoverY,
      delta * 5
    );
  });

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
    setSelectedMachine(isSelected ? null : machineData);
  };

  if (!isVisible) return null;

  return (
    <group
      ref={meshRef}
      position={[machineData.position.x, machineData.position.y, machineData.position.z]}
      rotation={[machineData.rotation.x, machineData.rotation.y, machineData.rotation.z]}
      onClick={(e) => {
        e.stopPropagation();
        handleClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {/* 3D Model */}
      <primitive object={clonedScene} castShadow receiveShadow />

      {/* Selection Highlight Ring */}
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#00ff00" toneMapped={false} />
        </mesh>
      )}

      {/* Info Label (Visible on Hover/Select) */}
      {(hovered || isSelected) && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm">
            <p className="font-bold">{machineData.operation.op_no}</p>
            <p>{machineData.operation.machine_type}</p>
          </div>
        </Html>
      )}
    </group>
  );
};
