import { Vehicle, BootIrregularity } from '../types/vehicle.types';
import { Item, ItemDimensions } from '../types/item.types';
import { IrregularitySeverity, ItemRigidity } from '../types/enums';

export interface PackedItem {
  item: Item;
  position: { x: number; y: number; z: number };
  orientation: ItemDimensions;
  compressed: boolean;
  compressionApplied: number; // percentage
}

export interface PackingResult {
  packedItems: PackedItem[];
  unpackedItems: Item[];
  volumeUtilization: number;
  bootSpaceUsed: number;
  bootSpaceAvailable: number;
  cabinOverflowSuggested: Item[];
  warnings: string[];
}

interface BootSpace {
  length: number;
  width: number;
  height: number;
  volume: number;
  efficiencyFactor: number;
}

interface ItemWithMetrics extends Item {
  volume: number;
  rigidityOrder: number;
  orientations: ItemDimensions[];
}

/**
 * Calculate the effective boot space considering irregularities
 */
function calculateEffectiveBootSpace(vehicle: Vehicle): BootSpace {
  const { bootMeasurements, bootIrregularities } = vehicle;
  const baseVolume = bootMeasurements.length * bootMeasurements.width * bootMeasurements.height;
  
  // Determine efficiency factor based on irregularities
  let efficiencyFactor = 0.85; // Base efficiency for regular boot
  
  for (const irregularity of bootIrregularities) {
    switch (irregularity.severity) {
      case IrregularitySeverity.MINOR:
        efficiencyFactor = Math.min(efficiencyFactor, 0.80);
        break;
      case IrregularitySeverity.MODERATE:
        efficiencyFactor = Math.min(efficiencyFactor, 0.75);
        break;
      case IrregularitySeverity.SIGNIFICANT:
        efficiencyFactor = Math.min(efficiencyFactor, 0.70);
        break;
    }
  }

  return {
    length: bootMeasurements.length,
    width: bootMeasurements.width,
    height: bootMeasurements.height,
    volume: baseVolume,
    efficiencyFactor
  };
}

/**
 * Calculate item volume
 */
function calculateItemVolume(dimensions: ItemDimensions): number {
  return dimensions.length * dimensions.width * dimensions.height;
}

/**
 * Get rigidity order for sorting (lower numbers = more rigid)
 */
function getRigidityOrder(rigidity: ItemRigidity): number {
  switch (rigidity) {
    case ItemRigidity.COMPLETELY_RIGID: return 0;
    case ItemRigidity.RIGID: return 1;
    case ItemRigidity.SEMI_RIGID: return 2;
    case ItemRigidity.FLEXIBLE: return 3;
    case ItemRigidity.VERY_FLEXIBLE: return 4;
    default: return 5;
  }
}

/**
 * Generate all possible orientations for an item
 */
function generateOrientations(dimensions: ItemDimensions, constraints: string): ItemDimensions[] {
  const { length, width, height } = dimensions;
  
  if (constraints === 'upright_only') {
    return [{ length, width, height }];
  }
  
  if (constraints === 'flat_only') {
    return [
      { length, width, height },
      { length: width, width: length, height },
      { length: height, width, height: length },
      { length, width: height, height: width },
      { length: width, width: height, height: length },
      { length: height, width: length, height: width }
    ].filter(o => o.height <= Math.max(length, width) * 0.6); // Flat constraint
  }
  
  // All orientations for 'any'
  return [
    { length, width, height },
    { length: width, width: length, height },
    { length: height, width, height: length },
    { length, width: height, height: width },
    { length: width, width: height, height: length },
    { length: height, width: length, height: width }
  ];
}

/**
 * Apply compression to an item if needed and possible
 */
function applyCompression(item: Item, compressionNeeded: number): { dimensions: ItemDimensions; compressionApplied: number } {
  const maxCompression = item.compressibility / 100;
  const actualCompression = Math.min(compressionNeeded / 100, maxCompression);
  
  if (actualCompression <= 0) {
    return { dimensions: item.dimensions, compressionApplied: 0 };
  }
  
  // Apply compression proportionally to all dimensions
  const compressionFactor = 1 - actualCompression;
  const compressedDimensions: ItemDimensions = {
    length: Math.round(item.dimensions.length * compressionFactor),
    width: Math.round(item.dimensions.width * compressionFactor),
    height: Math.round(item.dimensions.height * compressionFactor)
  };
  
  return { dimensions: compressedDimensions, compressionApplied: actualCompression * 100 };
}

/**
 * Check if an item orientation fits in the given space
 */
function fitsInSpace(
  orientation: ItemDimensions,
  space: { length: number; width: number; height: number },
  position: { x: number; y: number; z: number }
): boolean {
  return (
    position.x + orientation.length <= space.length &&
    position.y + orientation.width <= space.width &&
    position.z + orientation.height <= space.height
  );
}

/**
 * Check for collision with already packed items
 */
function hasCollision(
  orientation: ItemDimensions,
  position: { x: number; y: number; z: number },
  packedItems: PackedItem[]
): boolean {
  for (const packed of packedItems) {
    const overlap = (
      position.x < packed.position.x + packed.orientation.length &&
      position.x + orientation.length > packed.position.x &&
      position.y < packed.position.y + packed.orientation.width &&
      position.y + orientation.width > packed.position.y &&
      position.z < packed.position.z + packed.orientation.height &&
      position.z + orientation.height > packed.position.z
    );
    
    if (overlap) return true;
  }
  return false;
}

/**
 * Find the best position for an item in the boot space
 */
function findBestPosition(
  orientation: ItemDimensions,
  bootSpace: BootSpace,
  packedItems: PackedItem[]
): { x: number; y: number; z: number } | null {
  // Try to place items starting from bottom-left-back corner
  // and work systematically through the space
  const stepSize = 50; // mm increments for position searching
  
  for (let z = 0; z <= bootSpace.height - orientation.height; z += stepSize) {
    for (let y = 0; y <= bootSpace.width - orientation.width; y += stepSize) {
      for (let x = 0; x <= bootSpace.length - orientation.length; x += stepSize) {
        const position = { x, y, z };
        
        if (fitsInSpace(orientation, bootSpace, position) && 
            !hasCollision(orientation, position, packedItems)) {
          return position;
        }
      }
    }
  }
  
  return null;
}

/**
 * Preprocess items for packing
 */
function preprocessItems(items: Item[]): ItemWithMetrics[] {
  return items.map(item => ({
    ...item,
    volume: calculateItemVolume(item.dimensions),
    rigidityOrder: getRigidityOrder(item.rigidity),
    orientations: generateOrientations(item.dimensions, item.orientationConstraints)
  })).sort((a, b) => {
    // Sort by volume (descending) then by rigidity (ascending - more rigid first)
    if (b.volume !== a.volume) return b.volume - a.volume;
    return a.rigidityOrder - b.rigidityOrder;
  });
}

/**
 * Main packing algorithm
 */
export function packItems(vehicle: Vehicle, items: Item[]): PackingResult {
  const bootSpace = calculateEffectiveBootSpace(vehicle);
  const processedItems = preprocessItems(items);
  const packedItems: PackedItem[] = [];
  const unpackedItems: Item[] = [];
  const warnings: string[] = [];
  
  let totalVolumeUsed = 0;
  const effectiveBootVolume = bootSpace.volume * bootSpace.efficiencyFactor;
  
  for (const itemWithMetrics of processedItems) {
    let packed = false;
    
    // Try each orientation
    for (const orientation of itemWithMetrics.orientations) {
      const position = findBestPosition(orientation, bootSpace, packedItems);
      
      if (position) {
        packedItems.push({
          item: itemWithMetrics,
          position,
          orientation,
          compressed: false,
          compressionApplied: 0
        });
        
        totalVolumeUsed += calculateItemVolume(orientation);
        packed = true;
        break;
      }
    }
    
    // If not packed and item is compressible, try with compression
    if (!packed && itemWithMetrics.compressibility > 0) {
      for (let compression = 5; compression <= itemWithMetrics.compressibility; compression += 5) {
        const { dimensions: compressedDims, compressionApplied } = applyCompression(itemWithMetrics, compression);
        const compressedOrientations = generateOrientations(compressedDims, itemWithMetrics.orientationConstraints);
        
        for (const orientation of compressedOrientations) {
          const position = findBestPosition(orientation, bootSpace, packedItems);
          
          if (position) {
            packedItems.push({
              item: itemWithMetrics,
              position,
              orientation,
              compressed: true,
              compressionApplied
            });
            
            totalVolumeUsed += calculateItemVolume(orientation);
            packed = true;
            break;
          }
        }
        
        if (packed) break;
      }
    }
    
    if (!packed) {
      unpackedItems.push(itemWithMetrics);
    }
  }
  
  // Suggest cabin overflow for unpacked items that are cabin suitable
  const cabinOverflowSuggested = unpackedItems.filter(item => item.cabinSuitable);
  
  // Add warnings for irregularities
  if (vehicle.bootIrregularities.length > 0) {
    const significantIrregularities = vehicle.bootIrregularities.filter(
      irr => irr.severity === IrregularitySeverity.SIGNIFICANT
    );
    if (significantIrregularities.length > 0) {
      warnings.push('Boot has significant irregularities that may affect actual packing capacity');
    }
  }
  
  const volumeUtilization = (totalVolumeUsed / effectiveBootVolume) * 100;
  
  return {
    packedItems,
    unpackedItems,
    volumeUtilization: Math.min(volumeUtilization, 100),
    bootSpaceUsed: totalVolumeUsed,
    bootSpaceAvailable: effectiveBootVolume,
    cabinOverflowSuggested,
    warnings
  };
}

/**
 * Utility function to calculate total weight of packed items
 */
export function calculateTotalWeight(packedItems: PackedItem[]): number {
  return packedItems.reduce((total, packed) => total + packed.item.weight, 0);
}

/**
 * Utility function to get packing summary statistics
 */
export function getPackingSummary(result: PackingResult): {
  totalItems: number;
  packedCount: number;
  unpackedCount: number;
  cabinSuitableUnpacked: number;
  totalWeight: number;
} {
  return {
    totalItems: result.packedItems.length + result.unpackedItems.length,
    packedCount: result.packedItems.length,
    unpackedCount: result.unpackedItems.length,
    cabinSuitableUnpacked: result.cabinOverflowSuggested.length,
    totalWeight: calculateTotalWeight(result.packedItems)
  };
} 