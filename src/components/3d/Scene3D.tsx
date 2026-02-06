import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLineStore } from '@/store/useLineStore';
import { Machine3D } from './Machine3D';
import { Ground } from './Ground';
import { CameraController } from './CameraController';
import { SceneLighting } from './SceneLighting';
import { Pathway } from './Pathway';

/**
 * Main 3D scene container for the sewing line visualization
 */
export const Scene3D = () => {
  const { machineLayout, selectedMachine } = useLineStore();

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        camera={{ position: [5, 8, 10], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0f172a');
        }}
      >
        <Suspense fallback={null}>
          {/* Fog for depth effect */}
          <fog attach="fog" args={['#0f172a', 15, 60]} />

          {/* Lighting setup */}
          <SceneLighting />

          {/* Ground plane with grid */}
          <Ground />

          {/* Pathway - 8 feet (approx 2.44m) wide on the right side */}
          <Pathway
            position={[0, -0.005, -3.0]}
            width={2.44}
            length={100}
            label="Side Pathway"
          />

          {/* Machines */}
          {/* Revert rotation to 0 so line runs along X-axis as per user request */}
          <group rotation={[0, 0, 0]}>
            {machineLayout.map((machine) => (
              <Machine3D key={machine.id} machineData={machine} />
            ))}
          </group>

          {/* Camera controls */}
          <CameraController
            machineLayout={machineLayout}
            selectedMachine={selectedMachine}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
