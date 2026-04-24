'use client';
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useScroll, useTransform, useSpring } from 'motion/react';

function Dodecahedron() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const { viewport, mouse } = useThree();

  const { scrollY } = useScroll();
  
  // Custom rotation using shader-like approach via manual time accumulation
  // Since we don't have a custom shader material out of the box with drei that matches "glass dodecahedron with chromatic aberration",
  // MeshTransmissionMaterial does exactly this. To animate rotation without React state overhead, we use useFrame.
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Base rotation
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
      
      // Mouse interaction: tilt towards cursor (spring-damped is hard to purely do in useFrame without extra vars, but we can lerp)
      const targetX = (mouse.y * viewport.height) / 4;
      const targetY = (mouse.x * viewport.width) / 4;
      
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, meshRef.current.rotation.x + targetX * 0.1, 0.1);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, meshRef.current.rotation.y + targetY * 0.1, 0.1);
      
      // Scroll interaction scaling
      const scrollImpact = Math.min(window.scrollY / 500, 1);
      const scale = 1 - (scrollImpact * 0.4); // 1 to 0.6
      meshRef.current.scale.setScalar(scale);
      
      // Faster rotation on scroll
      meshRef.current.rotation.x += scrollImpact * delta * 2;
      meshRef.current.rotation.y += scrollImpact * delta * 2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[1.5, 0]} />
      <MeshTransmissionMaterial 
        ref={materialRef}
        backside
        samples={4}
        thickness={0.5}
        chromaticAberration={0.5}
        anisotropy={0.3}
        distortion={0.1}
        distortionScale={0.3}
        temporalDistortion={0.1}
        iridescence={0.5}
        iridescenceIOR={1.5}
        clearcoat={1}
        color="#ffffff"
        attenuationDistance={0.5}
        attenuationColor="#ffffff"
      />
    </mesh>
  );
}

export default function Hero3D() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <Dodecahedron />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
