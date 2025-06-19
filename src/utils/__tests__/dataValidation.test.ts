import {
  validateVehicle,
  validateItem,
  validateVehicles,
  validateItems,
  ValidationError,
  ValidationResult
} from '../dataValidation';
import { IrregularitySeverity, ItemRigidity } from '../../types/enums';

describe('Data Validation', () => {
  describe('validateVehicle', () => {
    const validVehicle = {
      makeModel: 'Toyota Corolla 2023',
      categoryTags: ['sedan', 'compact'],
      bootMeasurements: {
        length: 1000,
        width: 800,
        height: 500,
        openingWidth: 750,
        openingHeight: 450
      },
      bootIrregularities: [
        {
          type: 'wheel_wells',
          severity: IrregularitySeverity.MODERATE
        }
      ],
      cabinOverflowSpaces: {
        rearFloor: { length: 300, width: 400, height: 200 }
      },
      measurementConfidence: 'verified',
      submissionCount: 5,
      lastUpdated: '2024-01-15'
    };

    it('should validate a correct vehicle', () => {
      const result = validateVehicle(validVehicle);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject vehicle with invalid makeModel', () => {
      const invalidVehicle = { ...validVehicle, makeModel: null };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'makeModel',
        message: 'makeModel is required and must be a string',
        value: null
      });
    });

    it('should reject vehicle with non-array categoryTags', () => {
      const invalidVehicle = { ...validVehicle, categoryTags: 'sedan' };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'categoryTags',
        message: 'categoryTags must be an array',
        value: 'sedan'
      });
    });

    it('should reject vehicle with missing bootMeasurements', () => {
      const invalidVehicle = { ...validVehicle, bootMeasurements: undefined as any };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'bootMeasurements',
        message: 'bootMeasurements is required'
      });
    });

    it('should reject vehicle with invalid boot dimensions', () => {
      const invalidVehicle = {
        ...validVehicle,
        bootMeasurements: {
          ...validVehicle.bootMeasurements,
          length: -100,
          width: 150, // Too small
          height: 'invalid' as any
        }
      };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'bootMeasurements.length',
        message: 'length must be a positive integer (mm)',
        value: -100
      });
      expect(result.errors).toContainEqual({
        field: 'bootMeasurements.width',
        message: 'boot width must be at least 200mm',
        value: 150
      });
      expect(result.errors).toContainEqual({
        field: 'bootMeasurements.height',
        message: 'height must be a positive integer (mm)',
        value: 'invalid'
      });
    });

    it('should reject vehicle with opening dimensions larger than internal', () => {
      const invalidVehicle = {
        ...validVehicle,
        bootMeasurements: {
          ...validVehicle.bootMeasurements,
          openingWidth: 900, // Larger than width (800)
          openingHeight: 600  // Larger than height (500)
        }
      };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'bootMeasurements.openingWidth',
        message: 'opening width cannot exceed internal width',
        value: { openingWidth: 900, width: 800 }
      });
    });

    it('should reject vehicle with invalid irregularity type', () => {
      const invalidVehicle = {
        ...validVehicle,
        bootIrregularities: [
          {
            type: 'invalid_type',
            severity: IrregularitySeverity.MODERATE
          }
        ]
      };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.field.includes('bootIrregularities[0].type')
      )).toBe(true);
    });

    it('should reject vehicle with invalid measurement confidence', () => {
      const invalidVehicle = { ...validVehicle, measurementConfidence: 'invalid' };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'measurementConfidence',
        message: 'measurementConfidence must be one of: manufacturer, verified, user_submitted',
        value: 'invalid'
      });
    });

    it('should reject vehicle with invalid lastUpdated date', () => {
      const invalidVehicle = { ...validVehicle, lastUpdated: 'invalid-date' };
      const result = validateVehicle(invalidVehicle);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'lastUpdated',
        message: 'lastUpdated must be a valid date string (YYYY-MM-DD)',
        value: 'invalid-date'
      });
    });
  });

  describe('validateItem', () => {
    const validItem = {
      name: 'Large Suitcase',
      dimensions: {
        length: 750,
        width: 500,
        height: 300
      },
      weight: 15,
      rigidity: ItemRigidity.RIGID,
      category: 'luggage',
      cabinSuitable: true,
      compressibility: 10,
      stackable: true,
      orientationConstraints: 'any',
      customItem: false
    };

    it('should validate a correct item', () => {
      const result = validateItem(validItem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject item with invalid name', () => {
      const invalidItem = { ...validItem, name: null };
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'name is required and must be a string',
        value: null
      });
    });

    it('should reject item with invalid dimensions', () => {
      const invalidItem = {
        ...validItem,
        dimensions: {
          length: -100,
          width: 'invalid' as any,
          height: 0
        }
      };
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'dimensions.length',
        message: 'length must be a positive integer (mm)',
        value: -100
      });
      expect(result.errors).toContainEqual({
        field: 'dimensions.width',
        message: 'width must be a positive integer (mm)',
        value: 'invalid'
      });
      expect(result.errors).toContainEqual({
        field: 'dimensions.height',
        message: 'height must be a positive integer (mm)',
        value: 0
      });
    });

    it('should reject item with invalid weight', () => {
      const invalidItem = { ...validItem, weight: 100 }; // Exceeds 50kg limit
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'weight',
        message: 'weight must be a number between 0.1 and 50 kg',
        value: 100
      });
    });

    it('should reject item with invalid rigidity', () => {
      const invalidItem = { ...validItem, rigidity: 'super_rigid' };
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.field === 'rigidity' && error.message.includes('rigidity must be one of')
      )).toBe(true);
    });

    it('should reject item with invalid compressibility', () => {
      const invalidItem = { ...validItem, compressibility: 50 }; // Exceeds 30% limit
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'compressibility',
        message: 'compressibility must be an integer between 0 and 30',
        value: 50
      });
    });

    it('should reject item with invalid category', () => {
      const invalidItem = { ...validItem, category: 'invalid_category' };
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message: 'category must be one of: luggage, baby_gear, sports, shopping, equipment, custom',
        value: 'invalid_category'
      });
    });

    it('should reject item with non-boolean fields', () => {
      const invalidItem = {
        ...validItem,
        cabinSuitable: 'yes' as any,
        stackable: 1 as any,
        customItem: 'false' as any
      };
      const result = validateItem(invalidItem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'cabinSuitable',
        message: 'cabinSuitable must be a boolean',
        value: 'yes'
      });
      expect(result.errors).toContainEqual({
        field: 'stackable',
        message: 'stackable must be a boolean',
        value: 1
      });
      expect(result.errors).toContainEqual({
        field: 'customItem',
        message: 'customItem must be a boolean',
        value: 'false'
      });
    });
  });

  describe('validateVehicles', () => {
    it('should validate array of vehicles', () => {
      const vehicles = [
        {
          makeModel: 'Toyota Corolla 2023',
          categoryTags: ['sedan'],
          bootMeasurements: { length: 1000, width: 800, height: 500 },
          bootIrregularities: [],
          cabinOverflowSpaces: {},
          measurementConfidence: 'verified',
          submissionCount: 1,
          lastUpdated: '2024-01-15'
        }
      ];
      
      const result = validateVehicles(vehicles);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array input', () => {
      const result = validateVehicles('not an array' as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'vehicles',
        message: 'vehicles must be an array'
      });
    });

    it('should include index in error field names', () => {
      const vehicles = [
        {
          makeModel: null, // Invalid
          categoryTags: ['sedan'],
          bootMeasurements: { length: 1000, width: 800, height: 500 },
          bootIrregularities: [],
          cabinOverflowSpaces: {},
          measurementConfidence: 'verified',
          submissionCount: 1,
          lastUpdated: '2024-01-15'
        }
      ];
      
      const result = validateVehicles(vehicles);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => 
        error.field === 'vehicles[0].makeModel'
      )).toBe(true);
    });
  });

  describe('validateItems', () => {
    it('should validate array of items', () => {
      const items = [
        {
          name: 'Test Item',
          dimensions: { length: 100, width: 100, height: 100 },
          weight: 1,
          rigidity: ItemRigidity.RIGID,
          category: 'luggage',
          cabinSuitable: true,
          compressibility: 0,
          stackable: true,
          orientationConstraints: 'any',
          customItem: false
        }
      ];
      
      const result = validateItems(items);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array input', () => {
      const result = validateItems({} as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'items',
        message: 'items must be an array'
      });
    });
  });
}); 