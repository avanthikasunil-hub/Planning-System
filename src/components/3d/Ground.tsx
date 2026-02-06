import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Animated ground plane with grid pattern
 */
export const Ground = () => {
  const gridRef = useRef<THREE.GridHelper>(null);

  // Subtle animation for the grid
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial
          color="#1e293b"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Grid helper */}
      <gridHelper
        ref={gridRef}
        args={[500, 250, '#3b82f6', '#334155']}
        position={[0, 0.01, 0]}
      />
    </group>
  );
};
