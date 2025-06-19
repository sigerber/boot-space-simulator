import { renderHook, waitFor, act } from '@testing-library/react';
import { useVehicleData, useFilteredVehicles, useVehicleSearch } from '../useVehicleData';
import { validateVehicles } from '../../utils/dataValidation';
import { transformVehicleData } from '../../utils/dataTransforms';

// Mock the utilities
jest.mock('../../utils/dataValidation');
jest.mock('../../utils/dataTransforms');

const mockValidateVehicles = validateVehicles as jest.MockedFunction<typeof validateVehicles>;
const mockTransformVehicleData = transformVehicleData as jest.MockedFunction<typeof transformVehicleData>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('useVehicleData', () => {
  const mockSampleVehicles = [
    {
      makeModel: 'Toyota Corolla 2023',
      categoryTags: ['sedan', 'compact'],
      bootMeasurements: { length: 1000, width: 800, height: 500 },
      bootIrregularities: [],
      cabinOverflowSpaces: {},
      measurementConfidence: 'verified' as const,
      submissionCount: 1,
      lastUpdated: '2024-01-15'
    }
  ];

  const mockRawVehicles = [
    {
      make: 'Honda',
      model: 'Civic',
      year: '2023',
      variant: 'Sedan',
      boot_dimensions: { length: 900, width: 750, height: 450, volume_liters: 300 },
      opening_dimensions: { width: null, height: null },
      irregularities: [],
      cabin_overflow: {},
      measurement_source: 'user_measurements',
      notes: 'Test'
    }
  ];

  const mockTransformedVehicles = [
    {
      makeModel: 'Honda Civic 2023',
      categoryTags: ['sedan', 'compact'],
      bootMeasurements: { length: 900, width: 750, height: 450 },
      bootIrregularities: [],
      cabinOverflowSpaces: {},
      measurementConfidence: 'user_submitted' as const,
      submissionCount: 1,
      lastUpdated: '2024-01-15'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateVehicles.mockReturnValue({ isValid: true, errors: [] });
    mockTransformVehicleData.mockReturnValue(mockTransformedVehicles);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('useVehicleData', () => {
    it('should load sample vehicles successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSampleVehicles
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawVehicles
        } as Response);

      const { result } = renderHook(() => useVehicleData());

      expect(result.current.loading).toBe(true);
      expect(result.current.vehicles).toEqual([]);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehicles).toHaveLength(2); // Sample + transformed
      expect(result.current.error).toBe(null);
      expect(result.current.validationErrors).toBe(null);
    });

    it('should handle sample data loading failure gracefully', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Sample fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawVehicles
        } as Response);

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehicles).toEqual(mockTransformedVehicles);
      expect(result.current.error).toBe(null);
    });

    it('should handle raw data loading failure gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSampleVehicles
        } as Response)
        .mockRejectedValueOnce(new Error('Raw fetch failed'));

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehicles).toEqual(mockSampleVehicles);
      expect(result.current.error).toBe(null);
    });

    it('should handle validation errors', async () => {
      const validationErrors = {
        isValid: false,
        errors: [{ field: 'test', message: 'Test error' }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSampleVehicles
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawVehicles
        } as Response);

      mockValidateVehicles
        .mockReturnValueOnce({ isValid: true, errors: [] }) // Sample validation
        .mockReturnValueOnce(validationErrors) // Transformed validation
        .mockReturnValueOnce({ isValid: true, errors: [] }); // Final validation

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.validationErrors).toEqual(validationErrors);
      expect(result.current.vehicles).toEqual(mockSampleVehicles); // Should still have sample data
    });

    it('should handle complete data loading failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Sample fetch failed'))
        .mockRejectedValueOnce(new Error('Raw fetch failed'));

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehicles).toEqual([]);
      expect(result.current.error).toBe('No valid vehicle data could be loaded');
    });

    it('should avoid duplicate vehicles', async () => {
      const duplicateVehicle = {
        makeModel: 'Toyota Corolla 2023', // Same as sample
        categoryTags: ['sedan'],
        bootMeasurements: { length: 1000, width: 800, height: 500 },
        bootIrregularities: [],
        cabinOverflowSpaces: {},
        measurementConfidence: 'verified' as const,
        submissionCount: 1,
        lastUpdated: '2024-01-15'
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSampleVehicles
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawVehicles
        } as Response);

      mockTransformVehicleData.mockReturnValue([duplicateVehicle]);

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.vehicles).toHaveLength(1); // No duplicate
      expect(result.current.vehicles[0].makeModel).toBe('Toyota Corolla 2023');
    });

    it('should provide reloadData function', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSampleVehicles
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRawVehicles
        } as Response);

      const { result } = renderHook(() => useVehicleData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.reloadData).toBe('function');

      // Verify that reloadData can be called without errors
      await act(async () => {
        result.current.reloadData();
      });
    });
  });

  describe('useFilteredVehicles', () => {
    const mockVehicles = [
      {
        makeModel: 'Toyota Corolla 2023',
        categoryTags: ['sedan', 'compact'],
        bootMeasurements: { length: 1000, width: 800, height: 500 },
        bootIrregularities: [],
        cabinOverflowSpaces: {},
        measurementConfidence: 'verified' as const,
        submissionCount: 1,
        lastUpdated: '2024-01-15'
      },
      {
        makeModel: 'Honda CR-V 2023',
        categoryTags: ['suv', 'compact_suv'],
        bootMeasurements: { length: 1200, width: 900, height: 600 },
        bootIrregularities: [],
        cabinOverflowSpaces: {},
        measurementConfidence: 'verified' as const,
        submissionCount: 1,
        lastUpdated: '2024-01-15'
      }
    ];

    it('should return all vehicles when no filter is provided', () => {
      const result = useFilteredVehicles(mockVehicles);
      expect(result).toEqual(mockVehicles);
    });

    it('should return all vehicles when empty filter is provided', () => {
      const result = useFilteredVehicles(mockVehicles, []);
      expect(result).toEqual(mockVehicles);
    });

    it('should filter vehicles by category', () => {
      const result = useFilteredVehicles(mockVehicles, ['sedan']);
      expect(result).toHaveLength(1);
      expect(result[0].makeModel).toBe('Toyota Corolla 2023');
    });

    it('should filter vehicles by multiple categories', () => {
      const result = useFilteredVehicles(mockVehicles, ['sedan', 'suv']);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no vehicles match filter', () => {
      const result = useFilteredVehicles(mockVehicles, ['minivan']);
      expect(result).toEqual([]);
    });
  });

  describe('useVehicleSearch', () => {
    const mockVehicles = [
      {
        makeModel: 'Toyota Corolla 2023',
        categoryTags: ['sedan'],
        bootMeasurements: { length: 1000, width: 800, height: 500 },
        bootIrregularities: [],
        cabinOverflowSpaces: {},
        measurementConfidence: 'verified' as const,
        submissionCount: 1,
        lastUpdated: '2024-01-15'
      },
      {
        makeModel: 'Honda CR-V 2023',
        categoryTags: ['suv'],
        bootMeasurements: { length: 1200, width: 900, height: 600 },
        bootIrregularities: [],
        cabinOverflowSpaces: {},
        measurementConfidence: 'verified' as const,
        submissionCount: 1,
        lastUpdated: '2024-01-15'
      }
    ];

    it('should return all vehicles when search term is empty', () => {
      const result = useVehicleSearch(mockVehicles, '');
      expect(result).toEqual(mockVehicles);
    });

    it('should return all vehicles when search term is whitespace', () => {
      const result = useVehicleSearch(mockVehicles, '   ');
      expect(result).toEqual(mockVehicles);
    });

    it('should search by make name', () => {
      const result = useVehicleSearch(mockVehicles, 'Toyota');
      expect(result).toHaveLength(1);
      expect(result[0].makeModel).toBe('Toyota Corolla 2023');
    });

    it('should search by model name', () => {
      const result = useVehicleSearch(mockVehicles, 'Corolla');
      expect(result).toHaveLength(1);
      expect(result[0].makeModel).toBe('Toyota Corolla 2023');
    });

    it('should be case insensitive', () => {
      const result = useVehicleSearch(mockVehicles, 'toyota');
      expect(result).toHaveLength(1);
      expect(result[0].makeModel).toBe('Toyota Corolla 2023');
    });

    it('should return empty array when no vehicles match', () => {
      const result = useVehicleSearch(mockVehicles, 'Ford');
      expect(result).toEqual([]);
    });

    it('should match partial strings', () => {
      const result = useVehicleSearch(mockVehicles, 'Cor');
      expect(result).toHaveLength(1);
      expect(result[0].makeModel).toBe('Toyota Corolla 2023');
    });
  });
}); 