import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import { Vehicle } from '../../types/vehicle.types';
import { PackingResult, PackedItem } from '../../utils/packingAlgorithm';
import * as THREE from 'three';

interface BootVisualizationProps {
  vehicle: Vehicle | null;
  packingResult: PackingResult | null;
  highlightedItem?: PackedItem | null;
}

// Convert mm to display units (scale down for better viewing)
const SCALE_FACTOR = 0.001; // 1mm = 0.001 units

// Color scheme as per specifications
const COLORS = {
  bootOutline: '#666666',
  gridLines: '#cccccc',
  packedGreen: '#22c55e',    // >20% space remaining
  packedYellow: '#eab308',   // <20% space remaining  
  packedOrange: '#f97316',   // requires compression
  unpackedRed: '#ef4444',    // doesn't fit
  cabinBlue: '#3b82f6',      // cabin suggestion
  highlight: '#ffffff'
};

function BootOutline({ vehicle }: { vehicle: Vehicle }) {
  const { length, width, height } = vehicle.bootMeasurements;
  
  // Scale dimensions for display
  const scaledLength = length * SCALE_FACTOR;
  const scaledWidth = width * SCALE_FACTOR;
  const scaledHeight = height * SCALE_FACTOR;
  
  return (
    <group>
      {/* Boot outline wireframe */}
      <Box 
        args={[scaledLength, scaledHeight, scaledWidth]}
        position={[0, scaledHeight/2, 0]}
      >
        <meshBasicMaterial 
          color={COLORS.bootOutline} 
          wireframe 
          transparent 
          opacity={0.5} 
        />
      </Box>
      
      {/* Grid lines every 100mm */}
      <GridLines 
        length={scaledLength} 
        width={scaledWidth} 
        height={scaledHeight} 
      />
      
      {/* Dimension labels */}
      <DimensionLabels 
        length={length} 
        width={width} 
        height={height}
        scaledLength={scaledLength}
        scaledWidth={scaledWidth}
        scaledHeight={scaledHeight}
      />
    </group>
  );
}

function GridLines({ length, width }: { length: number; width: number; height: number }) {
  const gridStep = 0.1; // 100mm in display units
  
  // Create grid lines - simplified approach for better compatibility
  const gridLinesGeometry = new THREE.BufferGeometry();
  const positions = [];
  
  // X direction lines
  for (let x = -length/2; x <= length/2; x += gridStep) {
    positions.push(x, 0, -width/2);
    positions.push(x, 0, width/2);
  }
  
  // Z direction lines  
  for (let z = -width/2; z <= width/2; z += gridStep) {
    positions.push(-length/2, 0, z);
    positions.push(length/2, 0, z);
  }
  
  gridLinesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  
  return (
    <group>
      <primitive object={new THREE.Line(gridLinesGeometry, new THREE.LineBasicMaterial({ 
        color: COLORS.gridLines, 
        transparent: true, 
        opacity: 0.3 
      }))} />
    </group>
  );
}

function DimensionLabels({ 
  length, width, height, 
  scaledLength, scaledWidth, scaledHeight 
}: { 
  length: number; width: number; height: number;
  scaledLength: number; scaledWidth: number; scaledHeight: number;
}) {
  return (
    <group>
      {/* Length label */}
      <Text
        position={[0, -0.1, scaledWidth/2 + 0.1]}
        fontSize={0.05}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {length}mm
      </Text>
      
      {/* Width label */}
      <Text
        position={[scaledLength/2 + 0.1, -0.1, 0]}
        fontSize={0.05}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI/2, 0]}
      >
        {width}mm
      </Text>
      
      {/* Height label */}
      <Text
        position={[scaledLength/2 + 0.1, scaledHeight/2, scaledWidth/2 + 0.1]}
        fontSize={0.05}
        color="#333333"
        anchorX="center"
        anchorY="middle"
      >
        {height}mm
      </Text>
    </group>
  );
}

function PackedItemVisual({ 
  packedItem, 
  isHighlighted,
  spaceRemaining,
  bootCenterOffset
}: { 
  packedItem: PackedItem;
  isHighlighted: boolean;
  spaceRemaining: number;
  bootCenterOffset: { x: number; z: number };
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Calculate color based on space remaining and compression
  const getItemColor = () => {
    if (packedItem.compressed) return COLORS.packedOrange;
    if (spaceRemaining > 20) return COLORS.packedGreen;
    return COLORS.packedYellow;
  };
  
  // Scale item dimensions
  const scaledDimensions = {
    length: packedItem.orientation.length * SCALE_FACTOR,
    width: packedItem.orientation.width * SCALE_FACTOR,
    height: packedItem.orientation.height * SCALE_FACTOR
  };
  
  // Scale position (convert from mm coordinates to display coordinates)
  // Packing algorithm uses: x=length, y=width, z=height (floor to ceiling) with origin at corner
  // Three.js uses: x=length, y=height (floor to ceiling), z=width with boot centered at origin
  // Need to offset to match centered boot coordinate system
  const scaledPosition = {
    x: (packedItem.position.x * SCALE_FACTOR + scaledDimensions.length/2) - bootCenterOffset.x,
    y: packedItem.position.z * SCALE_FACTOR + scaledDimensions.height/2,
    z: (packedItem.position.y * SCALE_FACTOR + scaledDimensions.width/2) - bootCenterOffset.z
  };
  
  return (
    <group>
      <Box
        ref={meshRef}
        args={[scaledDimensions.length, scaledDimensions.height, scaledDimensions.width]}
        position={[scaledPosition.x, scaledPosition.y, scaledPosition.z]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshLambertMaterial 
          color={getItemColor()}
          transparent 
          opacity={hovered || isHighlighted ? 0.9 : 0.7}
          emissive={hovered || isHighlighted ? '#222222' : '#000000'}
        />
      </Box>
      
      {/* Item label */}
      {(hovered || isHighlighted) && (
        <Text
          position={[
            scaledPosition.x,
            scaledPosition.y + scaledDimensions.height/2 + 0.05,
            scaledPosition.z
          ]}
          fontSize={0.03}
          color="#333333"
          anchorX="center"
          anchorY="bottom"
        >
          {packedItem.item.name}
          {packedItem.compressed && ` (${packedItem.compressionApplied.toFixed(1)}%)`}
        </Text>
      )}
    </group>
  );
}

function UtilizationDisplay({ utilization }: { utilization: number }) {
  const getColor = () => {
    if (utilization > 80) return COLORS.unpackedRed;
    if (utilization > 60) return COLORS.packedOrange;
    return COLORS.packedGreen;
  };
  
  return (
    <Text
      position={[0, 1, 0]}
      fontSize={0.08}
      color={getColor()}
      anchorX="center"
      anchorY="middle"
    >
      {utilization.toFixed(1)}% Boot Utilization
    </Text>
  );
}

export function BootVisualization({ vehicle, packingResult, highlightedItem }: BootVisualizationProps) {
  if (!vehicle) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <div className="text-lg font-medium mb-2">3D Boot Visualization</div>
          <div className="text-sm">Select a vehicle to see 3D boot space</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-96 bg-gray-50 rounded-lg overflow-hidden">
      <Canvas
        camera={{ 
          position: [2, 1.5, 2], 
          fov: 50,
          near: 0.01,
          far: 100
        }}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.4} />
        
        {/* Boot outline and grid */}
        <BootOutline vehicle={vehicle} />
        
        {/* Packed items */}
        {packingResult?.packedItems.map((packedItem, index) => {
          const bootCenterOffset = {
            x: (vehicle.bootMeasurements.length * SCALE_FACTOR) / 2,
            z: (vehicle.bootMeasurements.width * SCALE_FACTOR) / 2
          };
          return (
            <PackedItemVisual
              key={index}
              packedItem={packedItem}
              isHighlighted={highlightedItem === packedItem}
              spaceRemaining={100 - packingResult.volumeUtilization}
              bootCenterOffset={bootCenterOffset}
            />
          );
        })}
        
        {/* Utilization display */}
        {packingResult && (
          <UtilizationDisplay utilization={packingResult.volumeUtilization} />
        )}
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={0.5}
          maxDistance={10}
          target={[0, 0.5, 0]}
        />
      </Canvas>
      
      {/* View controls overlay */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded px-3 py-2 text-xs text-gray-600">
        <div>🖱️ Drag to rotate</div>
        <div>🔍 Scroll to zoom</div>
        <div>✋ Right-click + drag to pan</div>
      </div>
      
      {/* Color legend */}
      <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded p-3 text-xs">
        <div className="font-medium mb-2">Color Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.packedGreen }}></div>
            <span>Plenty of space (&gt;20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.packedYellow }}></div>
            <span>Tight fit (&lt;20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.packedOrange }}></div>
            <span>Compressed</span>
          </div>
        </div>
      </div>
    </div>
  );
} 