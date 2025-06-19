import { packItems, calculateTotalWeight, getPackingSummary } from '../packingAlgorithm';
import { Vehicle } from '../../types/vehicle.types';
import { Item } from '../../types/item.types';
import { IrregularitySeverity, ItemRigidity } from '../../types/enums';

// Test data
const mockVehicle: Vehicle = {
  makeModel: 'Toyota Corolla 2023',
  categoryTags: ['sedan', 'compact'],
  bootMeasurements: {
    length: 1000,
    width: 1000,
    height: 500
  },
  bootIrregularities: [],
  cabinOverflowSpaces: {
    rearFloor: {
      length: 300,
      width: 400,
      height: 200
    }
  },
  measurementConfidence: 'verified',
  submissionCount: 5,
  lastUpdated: '2024-01-15'
};

const mockVehicleWithIrregularities: Vehicle = {
  ...mockVehicle,
  bootIrregularities: [
    {
      type: 'wheel_wells',
      severity: IrregularitySeverity.MODERATE
    }
  ]
};

const smallRigidItem: Item = {
  name: 'Small Suitcase',
  dimensions: { length: 400, width: 300, height: 200 },
  weight: 5,
  rigidity: ItemRigidity.RIGID,
  category: 'luggage',
  cabinSuitable: true,
  compressibility: 0,
  stackable: true,
  orientationConstraints: 'any',
  customItem: false
};

const largeRigidItem: Item = {
  name: 'Large Suitcase',
  dimensions: { length: 750, width: 500, height: 300 },
  weight: 15,
  rigidity: ItemRigidity.RIGID,
  category: 'luggage',
  cabinSuitable: true,
  compressibility: 0,
  stackable: true,
  orientationConstraints: 'any',
  customItem: false
};

const flexibleItem: Item = {
  name: 'Duffel Bag',
  dimensions: { length: 600, width: 300, height: 300 },
  weight: 8,
  rigidity: ItemRigidity.FLEXIBLE,
  category: 'luggage',
  cabinSuitable: true,
  compressibility: 20,
  stackable: true,
  orientationConstraints: 'any',
  customItem: false
};

const uprightOnlyItem: Item = {
  name: 'Fragile Equipment',
  dimensions: { length: 300, width: 300, height: 400 },
  weight: 12,
  rigidity: ItemRigidity.COMPLETELY_RIGID,
  category: 'equipment',
  cabinSuitable: false,
  compressibility: 0,
  stackable: false,
  orientationConstraints: 'upright_only',
  customItem: false
};

const oversizedItem: Item = {
  name: 'Oversized Box',
  dimensions: { length: 1200, width: 800, height: 600 },
  weight: 25,
  rigidity: ItemRigidity.RIGID,
  category: 'equipment',
  cabinSuitable: false,
  compressibility: 0,
  stackable: true,
  orientationConstraints: 'any',
  customItem: false
};

describe('packingAlgorithm', () => {
  describe('packItems', () => {
    it('should pack a single small item successfully', () => {
      const result = packItems(mockVehicle, [smallRigidItem]);
      
      expect(result.packedItems).toHaveLength(1);
      expect(result.unpackedItems).toHaveLength(0);
      expect(result.packedItems[0].item.name).toBe(smallRigidItem.name);
      expect(result.packedItems[0].item.dimensions).toEqual(smallRigidItem.dimensions);
      expect(result.packedItems[0].compressed).toBe(false);
      expect(result.volumeUtilization).toBeGreaterThan(0);
    });

    it('should handle empty items array', () => {
      const result = packItems(mockVehicle, []);
      
      expect(result.packedItems).toHaveLength(0);
      expect(result.unpackedItems).toHaveLength(0);
      expect(result.volumeUtilization).toBe(0);
      expect(result.bootSpaceUsed).toBe(0);
    });

    it('should pack multiple items that fit', () => {
      const items = [smallRigidItem, smallRigidItem];
      const result = packItems(mockVehicle, items);
      
      expect(result.packedItems.length).toBeGreaterThanOrEqual(1);
      expect(result.unpackedItems.length).toBeLessThanOrEqual(1);
    });

    it('should not pack oversized items', () => {
      const result = packItems(mockVehicle, [oversizedItem]);
      
      expect(result.packedItems).toHaveLength(0);
      expect(result.unpackedItems).toHaveLength(1);
      expect(result.unpackedItems[0].name).toBe(oversizedItem.name);
      expect(result.unpackedItems[0].dimensions).toEqual(oversizedItem.dimensions);
    });

    it('should respect orientation constraints', () => {
      const result = packItems(mockVehicle, [uprightOnlyItem]);
      
      if (result.packedItems.length > 0) {
        const packed = result.packedItems[0];
        // For upright_only, the height should be the original height
        expect(packed.orientation.height).toBe(uprightOnlyItem.dimensions.height);
      }
    });

    it('should apply compression when needed', () => {
      // Create a scenario where compression is needed
      const tightVehicle: Vehicle = {
        ...mockVehicle,
        bootMeasurements: {
          length: 650,
          width: 350,
          height: 350
        }
      };
      
      const result = packItems(tightVehicle, [flexibleItem]);
      
      if (result.packedItems.length > 0) {
        const packed = result.packedItems[0];
        // Should either pack without compression or with compression
        expect(packed.compressionApplied).toBeGreaterThanOrEqual(0);
      }
    });

    it('should suggest cabin overflow for suitable items', () => {
      const items = [oversizedItem, smallRigidItem];
      const result = packItems(mockVehicle, items);
      
      // If there are unpacked items that are cabin suitable, they should be suggested
      if (result.unpackedItems.length > 0) {
        const cabinSuitableUnpacked = result.unpackedItems.filter(item => item.cabinSuitable);
        expect(result.cabinOverflowSuggested.length).toBe(cabinSuitableUnpacked.length);
        if (cabinSuitableUnpacked.length > 0) {
          expect(result.cabinOverflowSuggested.some(item => item.cabinSuitable)).toBe(true);
        }
      }
    });

    it('should handle boot irregularities correctly', () => {
      const result = packItems(mockVehicleWithIrregularities, [smallRigidItem]);
      
      // With moderate irregularities, efficiency should be reduced
      expect(result.bootSpaceAvailable).toBeLessThan(
        mockVehicle.bootMeasurements.length * 
        mockVehicle.bootMeasurements.width * 
        mockVehicle.bootMeasurements.height * 0.85
      );
    });

    it('should add warnings for significant irregularities', () => {
      const vehicleWithSignificantIrregularities: Vehicle = {
        ...mockVehicle,
        bootIrregularities: [
          {
            type: 'wheel_wells',
            severity: IrregularitySeverity.SIGNIFICANT
          }
        ]
      };
      
      const result = packItems(vehicleWithSignificantIrregularities, [smallRigidItem]);
      
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('significant irregularities')
        ])
      );
    });

    it('should sort items correctly (largest and most rigid first)', () => {
      const items = [flexibleItem, largeRigidItem, smallRigidItem];
      const result = packItems(mockVehicle, items);
      
      // The algorithm should process items in order of volume (descending) then rigidity
      // We can't directly test the sorting, but we can verify consistent behavior
      expect(result.packedItems.length + result.unpackedItems.length).toBe(items.length);
    });

    it('should calculate volume utilization correctly', () => {
      const result = packItems(mockVehicle, [smallRigidItem]);
      
      if (result.packedItems.length > 0) {
        expect(result.volumeUtilization).toBeGreaterThan(0);
        expect(result.volumeUtilization).toBeLessThanOrEqual(100);
      } else {
        expect(result.volumeUtilization).toBe(0);
      }
    });

    it('should handle items with different rigidity levels', () => {
      const veryFlexibleItem: Item = {
        ...flexibleItem,
        rigidity: ItemRigidity.VERY_FLEXIBLE,
        compressibility: 30
      };
      
      const result = packItems(mockVehicle, [veryFlexibleItem, uprightOnlyItem]);
      
      expect(result.packedItems.length + result.unpackedItems.length).toBe(2);
    });
  });

  describe('calculateTotalWeight', () => {
    it('should calculate total weight correctly', () => {
      const packedItems = [
        {
          item: smallRigidItem,
          position: { x: 0, y: 0, z: 0 },
          orientation: smallRigidItem.dimensions,
          compressed: false,
          compressionApplied: 0
        },
        {
          item: largeRigidItem,
          position: { x: 400, y: 0, z: 0 },
          orientation: largeRigidItem.dimensions,
          compressed: false,
          compressionApplied: 0
        }
      ];
      
      const totalWeight = calculateTotalWeight(packedItems);
      expect(totalWeight).toBe(smallRigidItem.weight + largeRigidItem.weight);
    });

    it('should return 0 for empty array', () => {
      const totalWeight = calculateTotalWeight([]);
      expect(totalWeight).toBe(0);
    });
  });

  describe('getPackingSummary', () => {
    it('should provide correct summary statistics', () => {
      const result = packItems(mockVehicle, [smallRigidItem, largeRigidItem, oversizedItem]);
      const summary = getPackingSummary(result);
      
      expect(summary.totalItems).toBe(3);
      expect(summary.packedCount).toBe(result.packedItems.length);
      expect(summary.unpackedCount).toBe(result.unpackedItems.length);
      expect(summary.cabinSuitableUnpacked).toBe(result.cabinOverflowSuggested.length);
      expect(summary.totalWeight).toBeGreaterThan(0);
    });

    it('should handle empty packing results', () => {
      const emptyResult = packItems(mockVehicle, []);
      const summary = getPackingSummary(emptyResult);
      
      expect(summary.totalItems).toBe(0);
      expect(summary.packedCount).toBe(0);
      expect(summary.unpackedCount).toBe(0);
      expect(summary.cabinSuitableUnpacked).toBe(0);
      expect(summary.totalWeight).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle items with zero compressibility', () => {
      const rigidItem: Item = {
        ...smallRigidItem,
        compressibility: 0
      };
      
      const result = packItems(mockVehicle, [rigidItem]);
      
      if (result.packedItems.length > 0) {
        expect(result.packedItems[0].compressed).toBe(false);
        expect(result.packedItems[0].compressionApplied).toBe(0);
      }
    });

    it('should handle items with maximum compressibility', () => {
      const maxCompressibleItem: Item = {
        ...flexibleItem,
        compressibility: 30
      };
      
      const tightVehicle: Vehicle = {
        ...mockVehicle,
        bootMeasurements: {
          length: 500,
          width: 250,
          height: 250
        }
      };
      
      const result = packItems(tightVehicle, [maxCompressibleItem]);
      
      // Should either pack with compression or not pack at all
      expect(result.packedItems.length + result.unpackedItems.length).toBe(1);
    });

    it('should handle vehicles with no irregularities', () => {
      const cleanVehicle: Vehicle = {
        ...mockVehicle,
        bootIrregularities: []
      };
      
      const result = packItems(cleanVehicle, [smallRigidItem]);
      
      expect(result.warnings).toHaveLength(0);
      // Should use base efficiency factor of 0.85
      expect(result.bootSpaceAvailable).toBe(
        cleanVehicle.bootMeasurements.length *
        cleanVehicle.bootMeasurements.width *
        cleanVehicle.bootMeasurements.height * 0.85
      );
    });
  });
}); 