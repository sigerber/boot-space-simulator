import { Vehicle, BootIrregularity } from '../types/vehicle.types';
import { IrregularitySeverity } from '../types/enums';

// Interface for the raw vehicle data format from vehicles.json
interface RawVehicleData {
  make: string;
  model: string;
  year: string;
  variant: string;
  boot_dimensions: {
    length: number | null;
    width: number | null;
    height: number | null;
    volume_liters: number;
  };
  opening_dimensions: {
    width: number | null;
    height: number | null;
  };
  irregularities: string[];
  cabin_overflow: Record<string, any>;
  measurement_source: string;
  notes: string;
  hide?: boolean;
}

/**
 * Maps irregularity descriptions to structured boot irregularities
 */
function mapIrregularities(irregularities: string[]): BootIrregularity[] {
  const mapped: BootIrregularity[] = [];

  irregularities.forEach(irregularity => {
    const lower = irregularity.toLowerCase();
    
    if (lower.includes('wheel well')) {
      mapped.push({
        type: 'wheel_wells',
        severity: lower.includes('significant') || lower.includes('major') 
          ? IrregularitySeverity.SIGNIFICANT 
          : lower.includes('limited') || lower.includes('minimal')
          ? IrregularitySeverity.MINOR
          : IrregularitySeverity.MODERATE
      });
    }
    
    if (lower.includes('spare tire')) {
      mapped.push({
        type: 'spare_tire_bump',
        severity: IrregularitySeverity.MODERATE
      });
    }
    
    if (lower.includes('sloped') || lower.includes('slope')) {
      mapped.push({
        type: 'sloped_floor',
        severity: IrregularitySeverity.MODERATE
      });
    }
    
    if (lower.includes('narrow opening') || lower.includes('opening')) {
      mapped.push({
        type: 'narrow_opening',
        severity: IrregularitySeverity.MODERATE
      });
    }
  });

  return mapped;
}

/**
 * Maps measurement source to confidence level
 */
function mapMeasurementConfidence(source: string): 'manufacturer' | 'verified' | 'user_submitted' {
  // Check for verified sources first (more specific combinations)
  if (source.includes('verified') || source.includes('specs_and_forums')) return 'verified';
  if (source.includes('manufacturer')) return 'manufacturer';
  return 'user_submitted';
}

/**
 * Transforms raw vehicle data to match our TypeScript interface
 */
export function transformVehicleData(rawData: RawVehicleData[]): Vehicle[] {
  return rawData
    .filter(vehicle => 
      // Only include vehicles with complete boot dimensions
      vehicle.boot_dimensions.length !== null &&
      vehicle.boot_dimensions.width !== null &&
      vehicle.boot_dimensions.height !== null
    )
    .map(vehicle => {
      const makeModel = `${vehicle.make} ${vehicle.model} ${vehicle.year}${vehicle.variant ? ` ${vehicle.variant}` : ''}`;
      
      // Determine category tags based on make/model/variant
      const categoryTags: string[] = [];
      
      if (vehicle.variant?.toLowerCase().includes('sedan')) categoryTags.push('sedan');
      if (vehicle.variant?.toLowerCase().includes('hatchback')) categoryTags.push('hatchback');
      if (vehicle.model.toLowerCase().includes('rav4') || vehicle.model.toLowerCase().includes('cr-v')) {
        categoryTags.push('suv', 'compact_suv');
      }
      if (vehicle.model.toLowerCase().includes('explorer') || vehicle.model.toLowerCase().includes('tahoe')) {
        categoryTags.push('suv', 'large_suv');
      }
      if (vehicle.model.toLowerCase().includes('sienna') || vehicle.model.toLowerCase().includes('odyssey')) {
        categoryTags.push('minivan');
      }
      if (vehicle.model.toLowerCase().includes('corolla') || vehicle.model.toLowerCase().includes('civic')) {
        categoryTags.push('compact');
      }
      
      // Common rental cars
      const commonRentals = ['corolla', 'civic', 'rav4', 'cr-v', 'explorer'];
      if (commonRentals.some(model => vehicle.model.toLowerCase().includes(model))) {
        categoryTags.push('rental_common');
      }

      return {
        makeModel,
        categoryTags,
        bootMeasurements: {
          length: vehicle.boot_dimensions.length!,
          width: vehicle.boot_dimensions.width!,
          height: vehicle.boot_dimensions.height!,
          openingWidth: vehicle.opening_dimensions.width || undefined,
          openingHeight: vehicle.opening_dimensions.height || undefined,
        },
        bootIrregularities: mapIrregularities(vehicle.irregularities),
        cabinOverflowSpaces: {
          rearFloor: {
            length: 300,
            width: 400,
            height: 200
          },
          frontPassengerFloor: {
            length: 350,
            width: 300,
            height: 250
          }
        },
        measurementConfidence: mapMeasurementConfidence(vehicle.measurement_source),
        submissionCount: 1,
        lastUpdated: new Date().toISOString().split('T')[0],
        hide: vehicle.hide
      } as Vehicle;
    });
} 