import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import type { MachinePosition } from '@/types';

interface CameraControllerProps {
  machineLayout: MachinePosition[];
  selectedMachine: MachinePosition | null;
}

/**
 * Camera controller with MapControls for RTS-style navigation
 */
export const CameraController = ({ machineLayout, selectedMachine }: CameraControllerProps) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Move camera on selection change (optional)
  useEffect(() => {
    // Optional: If you want to snap to selection, implement here.
    // For MapControls, we usually let the user pan freely.
  }, [selectedMachine]);

  return (
    <MapControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      zoomSpeed={0.5}
      rotateSpeed={1.0}
      panSpeed={1.5}
      minDistance={0.5}
      maxDistance={100}
      screenSpacePanning={false}
      maxPolarAngle={Math.PI / 2.2}
    />
  );
};
