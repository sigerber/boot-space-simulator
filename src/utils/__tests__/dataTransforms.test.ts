import { transformVehicleData } from '../dataTransforms';
import { IrregularitySeverity } from '../../types/enums';

describe('Data Transforms', () => {
  describe('transformVehicleData', () => {
    const mockRawData = [
      {
        make: 'Toyota',
        model: 'Corolla',
        year: '2023',
        variant: 'Sedan',
        boot_dimensions: {
          length: 1041,
          width: 1245,
          height: 533,
          volume_liters: 370
        },
        opening_dimensions: {
          width: 1200,
          height: 500
        },
        irregularities: [
          'Wheel well intrusion reduces width',
          'Spare tire under cargo floor'
        ],
        cabin_overflow: {
          rear_floor_space: 'minimal'
        },
        measurement_source: 'manufacturer_specs_and_forums',
        notes: 'Test vehicle'
      },
      {
        make: 'Honda',
        model: 'CR-V',
        year: '2023',
        variant: 'SUV',
        boot_dimensions: {
          length: 953,
          width: 1003,
          height: 470,
          volume_liters: 1113
        },
        opening_dimensions: {
          width: null,
          height: null
        },
        irregularities: [
          'Significant wheel well intrusions limit width',
          'Sloped floor towards rear seats'
        ],
        cabin_overflow: {},
        measurement_source: 'user_measurements',
        notes: 'Test SUV'
      },
      {
        make: 'Ford',
        model: 'Explorer',
        year: '2023',
        variant: 'Large SUV',
        boot_dimensions: {
          length: null, // Should be filtered out
          width: 1041,
          height: 833,
          volume_liters: 515
        },
        opening_dimensions: {
          width: 1175,
          height: 1016
        },
        irregularities: [],
        cabin_overflow: {},
        measurement_source: 'manufacturer',
        notes: 'Incomplete data'
      }
    ];

    it('should transform valid raw data correctly', () => {
      const result = transformVehicleData(mockRawData);
      
      expect(result).toHaveLength(2); // Third vehicle should be filtered out due to null length
      
      const corolla = result.find(v => v.makeModel.includes('Corolla'));
      expect(corolla).toBeDefined();
      expect(corolla?.makeModel).toBe('Toyota Corolla 2023 Sedan');
      expect(corolla?.categoryTags).toContain('sedan');
      expect(corolla?.categoryTags).toContain('compact');
      expect(corolla?.categoryTags).toContain('rental_common');
      expect(corolla?.bootMeasurements.length).toBe(1041);
      expect(corolla?.bootMeasurements.openingWidth).toBe(1200);
      expect(corolla?.measurementConfidence).toBe('verified');
    });

    it('should map irregularities correctly', () => {
      const result = transformVehicleData(mockRawData);
      
      const corolla = result.find(v => v.makeModel.includes('Corolla'));
      expect(corolla?.bootIrregularities).toHaveLength(2);
      
      const wheelWellIrregularity = corolla?.bootIrregularities.find(
        i => i.type === 'wheel_wells'
      );
      expect(wheelWellIrregularity).toBeDefined();
      expect(wheelWellIrregularity?.severity).toBe(IrregularitySeverity.MODERATE);
      
      const spareTireIrregularity = corolla?.bootIrregularities.find(
        i => i.type === 'spare_tire_bump'
      );
      expect(spareTireIrregularity).toBeDefined();
    });

    it('should categorize SUVs correctly', () => {
      const result = transformVehicleData(mockRawData);
      
      const crv = result.find(v => v.makeModel.includes('CR-V'));
      expect(crv?.categoryTags).toContain('suv');
      expect(crv?.categoryTags).toContain('compact_suv');
      expect(crv?.categoryTags).toContain('rental_common');
    });

    it('should handle missing opening dimensions', () => {
      const result = transformVehicleData(mockRawData);
      
      const crv = result.find(v => v.makeModel.includes('CR-V'));
      expect(crv?.bootMeasurements.openingWidth).toBeUndefined();
      expect(crv?.bootMeasurements.openingHeight).toBeUndefined();
    });

    it('should filter out vehicles with incomplete boot dimensions', () => {
      const result = transformVehicleData(mockRawData);
      
      const explorer = result.find(v => v.makeModel.includes('Explorer'));
      expect(explorer).toBeUndefined(); // Should be filtered out due to null length
    });

    it('should map measurement confidence correctly', () => {
      const result = transformVehicleData(mockRawData);
      
      const corolla = result.find(v => v.makeModel.includes('Corolla'));
      expect(corolla?.measurementConfidence).toBe('verified'); // 'specs_and_forums' -> 'verified'
      
      const crv = result.find(v => v.makeModel.includes('CR-V'));
      expect(crv?.measurementConfidence).toBe('user_submitted');
    });

    it('should handle severity mapping for significant irregularities', () => {
      const result = transformVehicleData(mockRawData);
      
      const crv = result.find(v => v.makeModel.includes('CR-V'));
      const wheelWellIrregularity = crv?.bootIrregularities.find(
        i => i.type === 'wheel_wells'
      );
      expect(wheelWellIrregularity?.severity).toBe(IrregularitySeverity.SIGNIFICANT);
      
      const slopedFloorIrregularity = crv?.bootIrregularities.find(
        i => i.type === 'sloped_floor'
      );
      expect(slopedFloorIrregularity?.severity).toBe(IrregularitySeverity.MODERATE);
    });

    it('should provide default cabin overflow spaces', () => {
      const result = transformVehicleData(mockRawData);
      
      const corolla = result.find(v => v.makeModel.includes('Corolla'));
      expect(corolla?.cabinOverflowSpaces.rearFloor).toEqual({
        length: 300,
        width: 400,
        height: 200
      });
      expect(corolla?.cabinOverflowSpaces.frontPassengerFloor).toEqual({
        length: 350,
        width: 300,
        height: 250
      });
    });

    it('should set submission count and last updated', () => {
      const result = transformVehicleData(mockRawData);
      
      result.forEach(vehicle => {
        expect(vehicle.submissionCount).toBe(1);
        expect(vehicle.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should handle empty input', () => {
      const result = transformVehicleData([]);
      expect(result).toEqual([]);
    });

    it('should handle vehicles with no irregularities', () => {
      const dataWithNoIrregularities = [{
        make: 'Test',
        model: 'Vehicle',
        year: '2023',
        variant: 'Base',
        boot_dimensions: {
          length: 1000,
          width: 800,
          height: 600,
          volume_liters: 400
        },
        opening_dimensions: {
          width: null,
          height: null
        },
        irregularities: [],
        cabin_overflow: {},
        measurement_source: 'manufacturer',
        notes: 'Clean vehicle'
      }];

      const result = transformVehicleData(dataWithNoIrregularities);
      expect(result).toHaveLength(1);
      expect(result[0].bootIrregularities).toEqual([]);
    });
  });
}); 