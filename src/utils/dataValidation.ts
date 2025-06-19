import { Vehicle } from '../types/vehicle.types';
import { Item } from '../types/item.types';
import { IrregularitySeverity, ItemRigidity } from '../types/enums';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validates vehicle data according to specifications
 */
export function validateVehicle(vehicle: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!vehicle.makeModel || typeof vehicle.makeModel !== 'string') {
    errors.push({
      field: 'makeModel',
      message: 'makeModel is required and must be a string',
      value: vehicle.makeModel
    });
  }

  if (!Array.isArray(vehicle.categoryTags)) {
    errors.push({
      field: 'categoryTags',
      message: 'categoryTags must be an array',
      value: vehicle.categoryTags
    });
  }

  // Validate boot measurements
  if (!vehicle.bootMeasurements) {
    errors.push({
      field: 'bootMeasurements',
      message: 'bootMeasurements is required'
    });
  } else {
    const { length, width, height, openingWidth, openingHeight } = vehicle.bootMeasurements;

    // All dimensions must be positive integers (mm)
    if (!Number.isInteger(length) || length <= 0) {
      errors.push({
        field: 'bootMeasurements.length',
        message: 'length must be a positive integer (mm)',
        value: length
      });
    }

    if (!Number.isInteger(width) || width <= 0) {
      errors.push({
        field: 'bootMeasurements.width',
        message: 'width must be a positive integer (mm)',
        value: width
      });
    }

    if (!Number.isInteger(height) || height <= 0) {
      errors.push({
        field: 'bootMeasurements.height',
        message: 'height must be a positive integer (mm)',
        value: height
      });
    }

    // Boot dimensions must be larger than 200x200x200mm
    if (length && length < 200) {
      errors.push({
        field: 'bootMeasurements.length',
        message: 'boot length must be at least 200mm',
        value: length
      });
    }

    if (width && width < 200) {
      errors.push({
        field: 'bootMeasurements.width',
        message: 'boot width must be at least 200mm',
        value: width
      });
    }

    if (height && height < 200) {
      errors.push({
        field: 'bootMeasurements.height',
        message: 'boot height must be at least 200mm',
        value: height
      });
    }

    // Opening dimensions cannot exceed internal dimensions
    if (openingWidth && openingWidth > width) {
      errors.push({
        field: 'bootMeasurements.openingWidth',
        message: 'opening width cannot exceed internal width',
        value: { openingWidth, width }
      });
    }

    if (openingHeight && openingHeight > height) {
      errors.push({
        field: 'bootMeasurements.openingHeight',
        message: 'opening height cannot exceed internal height',
        value: { openingHeight, height }
      });
    }
  }

  // Validate boot irregularities
  if (!Array.isArray(vehicle.bootIrregularities)) {
    errors.push({
      field: 'bootIrregularities',
      message: 'bootIrregularities must be an array',
      value: vehicle.bootIrregularities
    });
  } else {
    vehicle.bootIrregularities.forEach((irregularity: any, index: number) => {
      const validTypes = ['wheel_wells', 'spare_tire_bump', 'sloped_floor', 'narrow_opening', 'side_storage'];
      if (!validTypes.includes(irregularity.type)) {
        errors.push({
          field: `bootIrregularities[${index}].type`,
          message: `irregularity type must be one of: ${validTypes.join(', ')}`,
          value: irregularity.type
        });
      }

      if (!Object.values(IrregularitySeverity).includes(irregularity.severity)) {
        errors.push({
          field: `bootIrregularities[${index}].severity`,
          message: `severity must be one of: ${Object.values(IrregularitySeverity).join(', ')}`,
          value: irregularity.severity
        });
      }
    });
  }

  // Validate measurement confidence
  const validConfidences = ['manufacturer', 'verified', 'user_submitted'];
  if (!validConfidences.includes(vehicle.measurementConfidence)) {
    errors.push({
      field: 'measurementConfidence',
      message: `measurementConfidence must be one of: ${validConfidences.join(', ')}`,
      value: vehicle.measurementConfidence
    });
  }

  // Validate submission count
  if (!Number.isInteger(vehicle.submissionCount) || vehicle.submissionCount < 0) {
    errors.push({
      field: 'submissionCount',
      message: 'submissionCount must be a non-negative integer',
      value: vehicle.submissionCount
    });
  }

  // Validate last updated date
  if (!vehicle.lastUpdated || !isValidDateString(vehicle.lastUpdated)) {
    errors.push({
      field: 'lastUpdated',
      message: 'lastUpdated must be a valid date string (YYYY-MM-DD)',
      value: vehicle.lastUpdated
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates item data according to specifications
 */
export function validateItem(item: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!item.name || typeof item.name !== 'string') {
    errors.push({
      field: 'name',
      message: 'name is required and must be a string',
      value: item.name
    });
  }

  // Validate dimensions
  if (!item.dimensions) {
    errors.push({
      field: 'dimensions',
      message: 'dimensions is required'
    });
  } else {
    const { length, width, height } = item.dimensions;

    // Dimensions must be positive integers
    if (!Number.isInteger(length) || length <= 0) {
      errors.push({
        field: 'dimensions.length',
        message: 'length must be a positive integer (mm)',
        value: length
      });
    }

    if (!Number.isInteger(width) || width <= 0) {
      errors.push({
        field: 'dimensions.width',
        message: 'width must be a positive integer (mm)',
        value: width
      });
    }

    if (!Number.isInteger(height) || height <= 0) {
      errors.push({
        field: 'dimensions.height',
        message: 'height must be a positive integer (mm)',
        value: height
      });
    }
  }

  // Validate weight (0.1-50kg range)
  if (typeof item.weight !== 'number' || item.weight < 0.1 || item.weight > 50) {
    errors.push({
      field: 'weight',
      message: 'weight must be a number between 0.1 and 50 kg',
      value: item.weight
    });
  }

  // Validate rigidity
  if (!Object.values(ItemRigidity).includes(item.rigidity)) {
    errors.push({
      field: 'rigidity',
      message: `rigidity must be one of: ${Object.values(ItemRigidity).join(', ')}`,
      value: item.rigidity
    });
  }

  // Validate category
  const validCategories = ['luggage', 'baby_gear', 'sports', 'shopping', 'equipment', 'custom'];
  if (!validCategories.includes(item.category)) {
    errors.push({
      field: 'category',
      message: `category must be one of: ${validCategories.join(', ')}`,
      value: item.category
    });
  }

  // Validate cabinSuitable
  if (typeof item.cabinSuitable !== 'boolean') {
    errors.push({
      field: 'cabinSuitable',
      message: 'cabinSuitable must be a boolean',
      value: item.cabinSuitable
    });
  }

  // Validate compressibility (0-30% maximum)
  if (!Number.isInteger(item.compressibility) || item.compressibility < 0 || item.compressibility > 30) {
    errors.push({
      field: 'compressibility',
      message: 'compressibility must be an integer between 0 and 30',
      value: item.compressibility
    });
  }

  // Validate stackable
  if (typeof item.stackable !== 'boolean') {
    errors.push({
      field: 'stackable',
      message: 'stackable must be a boolean',
      value: item.stackable
    });
  }

  // Validate orientation constraints
  const validOrientations = ['any', 'upright_only', 'flat_only'];
  if (!validOrientations.includes(item.orientationConstraints)) {
    errors.push({
      field: 'orientationConstraints',
      message: `orientationConstraints must be one of: ${validOrientations.join(', ')}`,
      value: item.orientationConstraints
    });
  }

  // Validate customItem
  if (typeof item.customItem !== 'boolean') {
    errors.push({
      field: 'customItem',
      message: 'customItem must be a boolean',
      value: item.customItem
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an array of vehicles
 */
export function validateVehicles(vehicles: any[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(vehicles)) {
    errors.push({
      field: 'vehicles',
      message: 'vehicles must be an array'
    });
    return { isValid: false, errors };
  }

  vehicles.forEach((vehicle, index) => {
    const result = validateVehicle(vehicle);
    if (!result.isValid) {
      result.errors.forEach(error => {
        errors.push({
          field: `vehicles[${index}].${error.field}`,
          message: error.message,
          value: error.value
        });
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an array of items
 */
export function validateItems(items: any[]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(items)) {
    errors.push({
      field: 'items',
      message: 'items must be an array'
    });
    return { isValid: false, errors };
  }

  items.forEach((item, index) => {
    const result = validateItem(item);
    if (!result.isValid) {
      result.errors.forEach(error => {
        errors.push({
          field: `items[${index}].${error.field}`,
          message: error.message,
          value: error.value
        });
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to validate date strings in YYYY-MM-DD format
 */
function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
} 