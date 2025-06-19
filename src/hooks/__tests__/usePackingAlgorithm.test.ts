import { renderHook, act } from '@testing-library/react';
import { usePackingAlgorithm } from '../usePackingAlgorithm';
import { Vehicle } from '../../types/vehicle.types';
import { Item } from '../../types/item.types';
import { ItemRigidity } from '../../types/enums';

// Create mock functions
const mockPackItems = jest.fn();
const mockGetPackingSummary = jest.fn();

// Mock the entire packingAlgorithm module
jest.mock('../../utils/packingAlgorithm', () => ({
  packItems: (...args: any[]) => mockPackItems(...args),
  getPackingSummary: (...args: any[]) => mockGetPackingSummary(...args),
}));

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
  cabinOverflowSpaces: {},
  measurementConfidence: 'verified',
  submissionCount: 5,
  lastUpdated: '2024-01-15'
};

const mockItem: Item = {
  name: 'Test Suitcase',
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

const mockPackingResult = {
  packedItems: [{
    item: mockItem,
    position: { x: 0, y: 0, z: 0 },
    orientation: mockItem.dimensions,
    compressed: false,
    compressionApplied: 0
  }],
  unpackedItems: [],
  volumeUtilization: 85,
  bootSpaceUsed: 24000000,
  bootSpaceAvailable: 425000000,
  cabinOverflowSuggested: [],
  warnings: []
};

const mockSummary = {
  totalItems: 1,
  packedCount: 1,
  unpackedCount: 0,
  cabinSuitableUnpacked: 0,
  totalWeight: 5
};

describe('usePackingAlgorithm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPackItems.mockResolvedValue(mockPackingResult);
    mockGetPackingSummary.mockReturnValue(mockSummary);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    expect(result.current.packingResult).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.packItemsInVehicle).toBe('function');
    expect(typeof result.current.clearResults).toBe('function');
  });

  it('should pack items successfully', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(mockPackItems).toHaveBeenCalledWith(mockVehicle, [mockItem]);
    expect(result.current.packingResult).toEqual(mockPackingResult);
    expect(result.current.summary).toEqual(mockSummary);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors correctly', async () => {
    const errorMessage = 'Packing failed';
    mockPackItems.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => usePackingAlgorithm());

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.packingResult).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle non-Error exceptions', async () => {
    mockPackItems.mockRejectedValueOnce('String error');

    const { result } = renderHook(() => usePackingAlgorithm());

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.error).toBe('An error occurred during packing');
  });

  it('should validate required parameters', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    // Test with null vehicle
    await act(async () => {
      await result.current.packItemsInVehicle(null as any, [mockItem]);
    });

    expect(result.current.error).toBe('Vehicle and items are required');
    expect(mockPackItems).not.toHaveBeenCalled();

    // Clear error and test with empty items
    act(() => {
      result.current.clearResults();
    });

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, []);
    });

    expect(result.current.error).toBe('Vehicle and items are required');
    expect(mockPackItems).not.toHaveBeenCalled();
  });

  it('should clear results correctly', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    // First pack some items
    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.packingResult).toEqual(mockPackingResult);
    expect(result.current.summary).toEqual(mockSummary);

    // Then clear results
    act(() => {
      result.current.clearResults();
    });

    expect(result.current.packingResult).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should update summary when packing result changes', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    // Initially summary should be null
    expect(result.current.summary).toBeNull();

    // After packing, summary should be available
    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.summary).toEqual(mockSummary);
    expect(mockGetPackingSummary).toHaveBeenCalledWith(mockPackingResult);
  });

  it('should handle multiple consecutive packing operations', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    const secondMockResult = {
      ...mockPackingResult,
      volumeUtilization: 90
    };

    // First packing operation
    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.packingResult).toEqual(mockPackingResult);

    // Second packing operation with different result
    mockPackItems.mockResolvedValueOnce(secondMockResult);

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.packingResult).toEqual(secondMockResult);
    expect(mockPackItems).toHaveBeenCalledTimes(2);
  });

  it('should clear error when starting new packing operation', async () => {
    const { result } = renderHook(() => usePackingAlgorithm());

    // First operation fails
    mockPackItems.mockRejectedValueOnce(new Error('First error'));

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.error).toBe('First error');

    // Second operation succeeds
    mockPackItems.mockResolvedValueOnce(mockPackingResult);

    await act(async () => {
      await result.current.packItemsInVehicle(mockVehicle, [mockItem]);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.packingResult).toEqual(mockPackingResult);
  });

  it('should maintain referential stability of callback functions', () => {
    const { result, rerender } = renderHook(() => usePackingAlgorithm());

    const initialPackFunction = result.current.packItemsInVehicle;
    const initialClearFunction = result.current.clearResults;

    // Rerender the hook
    rerender();

    // Functions should be referentially stable
    expect(result.current.packItemsInVehicle).toBe(initialPackFunction);
    expect(result.current.clearResults).toBe(initialClearFunction);
  });
}); 