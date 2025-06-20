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
  // Opening constraints
  openingWidth?: number;
  openingHeight?: number;
  hasOpeningConstraints: boolean;
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
    efficiencyFactor,
    openingWidth: bootMeasurements.openingWidth,
    openingHeight: bootMeasurements.openingHeight,
    hasOpeningConstraints: !!(bootMeasurements.openingWidth || bootMeasurements.openingHeight)
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
 * Check if an item orientation can pass through the boot opening
 */
function canPassThroughOpening(
  orientation: ItemDimensions,
  bootSpace: BootSpace,
  clearanceMargin: number = 20 // mm of clearance needed around item
): boolean {
  if (!bootSpace.hasOpeningConstraints) {
    return true; // No opening constraints to check
  }

  const effectiveOpeningWidth = bootSpace.openingWidth 
    ? bootSpace.openingWidth - clearanceMargin 
    : bootSpace.width; // Fallback to boot width if not specified
    
  const effectiveOpeningHeight = bootSpace.openingHeight 
    ? bootSpace.openingHeight - clearanceMargin 
    : bootSpace.height; // Fallback to boot height if not specified

  // Check if item can fit through opening in this orientation
  // Item needs to fit through the opening cross-section (width x height)
  return orientation.width <= effectiveOpeningWidth && 
         orientation.height <= effectiveOpeningHeight;
}

/**
 * Filter orientations that can pass through the boot opening
 */
function filterOrientationsForOpening(
  orientations: ItemDimensions[],
  bootSpace: BootSpace
): ItemDimensions[] {
  if (!bootSpace.hasOpeningConstraints) {
    return orientations;
  }

  return orientations.filter(orientation => canPassThroughOpening(orientation, bootSpace));
}

/**
 * Apply compression specifically to fit through boot opening
 */
function applyCompressionForOpening(
  item: Item,
  bootSpace: BootSpace
): { dimensions: ItemDimensions; compressionApplied: number } | null {
  if (!bootSpace.hasOpeningConstraints || item.compressibility <= 0) {
    return null;
  }

  const maxCompression = item.compressibility / 100;
  const clearanceMargin = 20; // mm
  
  const effectiveOpeningWidth = bootSpace.openingWidth 
    ? bootSpace.openingWidth - clearanceMargin 
    : bootSpace.width;
    
  const effectiveOpeningHeight = bootSpace.openingHeight 
    ? bootSpace.openingHeight - clearanceMargin 
    : bootSpace.height;

  // Try different compression levels to fit through opening
  for (let compression = 5; compression <= item.compressibility; compression += 5) {
    const actualCompression = Math.min(compression / 100, maxCompression);
    const compressionFactor = 1 - actualCompression;
    
    const compressedDimensions: ItemDimensions = {
      length: Math.round(item.dimensions.length * compressionFactor),
      width: Math.round(item.dimensions.width * compressionFactor),
      height: Math.round(item.dimensions.height * compressionFactor)
    };

    // Generate orientations for compressed item
    const compressedOrientations = generateOrientations(compressedDimensions, item.orientationConstraints);
    
    // Check if any orientation fits through opening
    for (const orientation of compressedOrientations) {
      if (orientation.width <= effectiveOpeningWidth && orientation.height <= effectiveOpeningHeight) {
        return { dimensions: orientation, compressionApplied: actualCompression * 100 };
      }
    }
  }

  return null; // Cannot compress enough to fit through opening
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
  // Try to place items starting from bottom-back-left corner (back of boot)
  // and work systematically toward the front (opening)
  const stepSize = 50; // mm increments for position searching
  
  for (let z = 0; z <= bootSpace.height - orientation.height; z += stepSize) {
    for (let y = 0; y <= bootSpace.width - orientation.width; y += stepSize) {
      for (let x = bootSpace.length - orientation.length; x >= 0; x -= stepSize) {
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
  let itemsRejectedByOpening = 0;
  let itemsRequiringCompression = 0;
  
  for (const itemWithMetrics of processedItems) {
    let packed = false;
    
    // Filter orientations based on opening constraints
    const validOrientations = filterOrientationsForOpening(itemWithMetrics.orientations, bootSpace);
    
    // If no orientations can pass through opening, skip this item
    if (validOrientations.length === 0 && bootSpace.hasOpeningConstraints) {
      // Try compression for opening access if item is compressible
      if (itemWithMetrics.compressibility > 0) {
        const compressionResult = applyCompressionForOpening(itemWithMetrics, bootSpace);
        if (compressionResult) {
          const position = findBestPosition(compressionResult.dimensions, bootSpace, packedItems);
          if (position) {
            packedItems.push({
              item: itemWithMetrics,
              position,
              orientation: compressionResult.dimensions,
              compressed: true,
              compressionApplied: compressionResult.compressionApplied
            });
            
            totalVolumeUsed += calculateItemVolume(compressionResult.dimensions);
            itemsRequiringCompression++;
            packed = true;
          }
        }
      }
      
      if (!packed) {
        unpackedItems.push(itemWithMetrics);
        itemsRejectedByOpening++;
        continue;
      }
    } else {
      // Try each valid orientation
      for (const orientation of validOrientations) {
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
      
      // If not packed and item is compressible, try with compression for space constraints
      if (!packed && itemWithMetrics.compressibility > 0) {
        for (let compression = 5; compression <= itemWithMetrics.compressibility; compression += 5) {
          const { dimensions: compressedDims, compressionApplied } = applyCompression(itemWithMetrics, compression);
          const compressedOrientations = generateOrientations(compressedDims, itemWithMetrics.orientationConstraints);
          const validCompressedOrientations = filterOrientationsForOpening(compressedOrientations, bootSpace);
          
          for (const orientation of validCompressedOrientations) {
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
              itemsRequiringCompression++;
              packed = true;
              break;
            }
          }
          
          if (packed) break;
        }
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
  
  // Add warnings for opening constraints
  if (bootSpace.hasOpeningConstraints) {
    if (itemsRejectedByOpening > 0) {
      warnings.push(`${itemsRejectedByOpening} item(s) could not fit through the boot opening despite fitting in the boot space`);
    }
    
    if (itemsRequiringCompression > 0) {
      warnings.push(`${itemsRequiringCompression} item(s) required compression to fit through the boot opening`);
    }
    
    // Check if opening significantly limits capacity
    const openingArea = (bootSpace.openingWidth || bootSpace.width) * (bootSpace.openingHeight || bootSpace.height);
    const bootCrossSection = bootSpace.width * bootSpace.height;
    if (openingArea < bootCrossSection * 0.6) {
      warnings.push('Boot opening dimensions significantly limit packing capacity compared to internal space');
    }
    
    // Warn about packing order if multiple items packed
    if (packedItems.length > 1) {
      warnings.push('Consider packing order - items placed deeper in the boot may be harder to access');
    }
    
    // Check for items that were very close to fitting (clearance issues)
    for (const unpackedItem of unpackedItems) {
      if (bootSpace.openingWidth && bootSpace.openingHeight) {
        const minDimension = Math.min(unpackedItem.dimensions.width, unpackedItem.dimensions.height);
        const maxOpening = Math.max(bootSpace.openingWidth, bootSpace.openingHeight);
        
        // If item dimensions are very close to opening size (within 30mm), it's a clearance issue
        if (minDimension <= maxOpening + 30 && minDimension > maxOpening) {
          warnings.push('Some items require tight clearance margins that may be impractical in real-world use');
          break;
        }
      }
    }
    
    // Additional check: if items are rejected but would fit with less clearance
    for (const unpackedItem of unpackedItems) {
      if (bootSpace.openingWidth && bootSpace.openingHeight) {
        // Check if item would fit through opening with minimal clearance (5mm instead of 20mm)
        const minimalClearance = 5;
        const effectiveOpeningWidthMinimal = bootSpace.openingWidth - minimalClearance;
        const effectiveOpeningHeightMinimal = bootSpace.openingHeight - minimalClearance;
        
        // Try all orientations with minimal clearance
        const orientations = generateOrientations(unpackedItem.dimensions, unpackedItem.orientationConstraints);
        const wouldFitWithMinimalClearance = orientations.some(orientation => 
          orientation.width <= effectiveOpeningWidthMinimal && 
          orientation.height <= effectiveOpeningHeightMinimal
        );
        
        if (wouldFitWithMinimalClearance) {
          warnings.push('Some items require tight clearance margins that may be impractical in real-world use');
          break;
        }
      }
    }
  }
  
  // Only warn about missing opening data if the vehicle data structure suggests it should have opening info
  // (e.g., if bootMeasurements has other optional fields but not opening dimensions)
  // For now, we'll skip this warning for cleaner behavior with legacy data
  // if (!bootSpace.hasOpeningConstraints && (bootSpace.openingWidth === undefined && bootSpace.openingHeight === undefined)) {
  //   warnings.push('Boot opening dimensions not available - actual packing may be more constrained');
  // }
  
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

/**
 * Apply compression to an item if needed and possible (original function)
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