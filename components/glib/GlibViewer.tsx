'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface GlibViewerProps {
  modelDirectory?: string;
}

// Component to load and display a single GLB tile with relative positioning
function GLBTile({ 
  url, 
  index, 
  referencePoint,
  onLoad 
}: { 
  url: string;
  index: number;
  referencePoint: THREE.Vector3 | null;
  onLoad: (center: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF(url);
  const outerGroupRef = useRef<THREE.Group>(null);
  const innerGroupRef = useRef<THREE.Group>(null);
  const [relativePosition, setRelativePosition] = useState<[number, number, number]>([0, 0, 0]);
  const [tileCenter, setTileCenter] = useState<THREE.Vector3 | null>(null);
  
  // First effect: Calculate and store this tile's ECEF center (runs once)
  useEffect(() => {
    if (scene && !tileCenter) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      
      setTileCenter(center);
      onLoad(center);
    }
  }, [scene, onLoad, tileCenter]);
  
  // Second effect: Calculate relative position whenever referencePoint changes
  useEffect(() => {
    if (tileCenter && referencePoint) {
      const relative = tileCenter.clone().sub(referencePoint);
      setRelativePosition([relative.x, relative.y, relative.z]);
    }
  }, [tileCenter, referencePoint]);
  
  // Third effect: Position the inner group to center the tile geometry at local origin
  useEffect(() => {
    if (innerGroupRef.current && tileCenter) {
      innerGroupRef.current.position.set(-tileCenter.x, -tileCenter.y, -tileCenter.z);
    }
  }, [tileCenter]);
  
  // Clone scene to avoid modifying original
  const clonedScene = scene.clone();
  
  // Make materials visible
  clonedScene.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.side = THREE.DoubleSide;
          });
        } else {
          child.material.side = THREE.DoubleSide;
        }
      }
    }
  });
  
  return (
    <group ref={outerGroupRef} position={relativePosition}>
      {/* Inner group centers the tile geometry at local 0,0,0 */}
      <group ref={innerGroupRef}>
        <primitive object={clonedScene} scale={1} />
      </group>
    </group>
  );
}

// Component to manage loading all tiles
function TilesGroup({ modelDirectory }: { modelDirectory: string }) {
  const [tileFiles, setTileFiles] = useState<string[]>([]);
  const [referencePoint, setReferencePoint] = useState<THREE.Vector3 | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [visibleTiles, setVisibleTiles] = useState<string[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [tileCenters, setTileCenters] = useState<THREE.Vector3[]>([]);
  const BATCH_SIZE = 100; // Load 100 tiles at a time
  
  const handleTileLoad = useCallback((center: THREE.Vector3) => {
    // Collect all tile centers to calculate average center point
    setTileCenters(prev => [...prev, center.clone()]);
    setLoadedCount(prev => prev + 1);
  }, []);
  
  // Calculate average center point from first batch of tiles
  useEffect(() => {
    if (tileCenters.length >= 10 && !referencePoint) {
      const avgCenter = new THREE.Vector3();
      tileCenters.forEach(c => avgCenter.add(c));
      avgCenter.divideScalar(tileCenters.length);
      setReferencePoint(avgCenter);
      console.log(`Reference point set from ${tileCenters.length} tiles`);
    }
  }, [tileCenters, referencePoint]);
  
  useEffect(() => {
    // Load all tiles from files.json
    fetch(`${modelDirectory}/files.json`)
      .then(res => res.json())
      .then((files: string[]) => {
        setTileFiles(files);
        // Start with first batch
        setVisibleTiles(files.slice(0, BATCH_SIZE));
      })
      .catch(err => {
        console.error('Failed to load files.json:', err);
      });
  }, [modelDirectory]);
  
  // Progressively load more tiles as previous batches complete
  useEffect(() => {
    if (loadedCount > 0 && visibleTiles.length < tileFiles.length) {
      const expectedLoaded = Math.min(visibleTiles.length, tileFiles.length);
      const loadProgress = loadedCount / expectedLoaded;
      
      // When 80% of current batch is loaded, start loading next batch
      if (loadProgress > 0.8) {
        const nextBatchEnd = Math.min(visibleTiles.length + BATCH_SIZE, tileFiles.length);
        if (nextBatchEnd > visibleTiles.length) {
          setVisibleTiles(tileFiles.slice(0, nextBatchEnd));
          console.log(`Loading batch: ${visibleTiles.length} -> ${nextBatchEnd} tiles`);
        }
      }
    }
  }, [loadedCount, visibleTiles.length, tileFiles]);
  
  // Rotate the entire model 25 degrees counter-clockwise to level Arthur's Seat
  const rotationY = 100 * (Math.PI / 180); // Convert degrees to radians
  
  return (
    <group rotation={[0, rotationY, 0]}>
      {visibleTiles.map((file, index) => (
        <Suspense key={file} fallback={null}>
          <GLBTile
            url={`${modelDirectory}/${file}`}
            index={index}
            referencePoint={referencePoint}
            onLoad={handleTileLoad}
          />
        </Suspense>
      ))}
    </group>
  );
}

export default function GlibViewer({
  modelDirectory = '/models/AurthurSeat',
}: GlibViewerProps) {
  const cameraRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);

  return (
    <div className="relative w-full h-full bg-white">
      <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-80 text-white p-4 rounded-lg shadow-lg z-10 text-sm">
        <p className="font-bold text-base">Arthur's Seat</p>
        <p className="text-xs">Google 3D Photorealistic Map Tiles</p>
        <p className="text-xs mt-2 text-gray-300">Progressive loading • 2108 tiles</p>
        <p className="text-xs text-gray-400 mt-1">Loading in batches of 100</p>
        <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-300">
          <p>🖱️ Left Click: Rotate</p>
          <p>🖱️ Ctrl + Drag: Pan</p>
          <p>🖱️ Right Click: Pan</p>
          <p>🖱️ Scroll: Zoom</p>
        </div>
      </div>

      <Canvas shadows style={{ width: '100%', height: '100%' }}>
        {/* Camera - positioned to see the terrain */}
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[100, 100, 100]}
          fov={75}
        />

        {/* Controls - Left click to rotate, Ctrl+drag to pan, Scroll to zoom */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          enablePan={true}
          panSpeed={1}
          rotateSpeed={1}
          zoomSpeed={1.2}
          minDistance={1}
          maxDistance={5000}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
          keys={{
            LEFT: 'ArrowLeft',
            UP: 'ArrowUp',
            RIGHT: 'ArrowRight',
            BOTTOM: 'ArrowDown'
          }}
        />

        {/* Lighting - bright overhead lighting on white background */}
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[0, 500, 0]} 
          intensity={1.5} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={1000}
          shadow-camera-left={-500}
          shadow-camera-right={500}
          shadow-camera-top={500}
          shadow-camera-bottom={-500}
        />
        <directionalLight position={[200, 300, 200]} intensity={0.8} />
        <directionalLight position={[-200, 300, -200]} intensity={0.6} />
        <hemisphereLight args={['#ffffff', '#cccccc', 0.6]} />

        {/* White background */}
        <color attach="background" args={['#ffffff']} />

        {/* Load all tiles with relative positioning */}
        <Suspense fallback={null}>
          <TilesGroup modelDirectory={modelDirectory} />
        </Suspense>
      </Canvas>
    </div>
  );
}
