import { useState, useCallback, useMemo } from 'react';
import { Vehicle } from '../types/vehicle.types';
import { Item } from '../types/item.types';
import { packItems, PackingResult, getPackingSummary } from '../utils/packingAlgorithm';

interface UsePackingAlgorithmReturn {
  packingResult: PackingResult | null;
  summary: ReturnType<typeof getPackingSummary> | null;
  isLoading: boolean;
  error: string | null;
  packItemsInVehicle: (vehicle: Vehicle, items: Item[]) => Promise<void>;
  clearResults: () => void;
}

export function usePackingAlgorithm(): UsePackingAlgorithmReturn {
  const [packingResult, setPackingResult] = useState<PackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return packingResult ? getPackingSummary(packingResult) : null;
  }, [packingResult]);

  const packItemsInVehicle = useCallback(async (vehicle: Vehicle, items: Item[]) => {
    if (!vehicle || !items || items.length === 0) {
      setError('Vehicle and items are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate async operation for better UX
      const result = await new Promise<PackingResult>((resolve) => {
        setTimeout(() => {
          resolve(packItems(vehicle, items));
        }, 100);
      });

      setPackingResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during packing');
      setPackingResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setPackingResult(null);
    setError(null);
  }, []);

  return {
    packingResult,
    summary,
    isLoading,
    error,
    packItemsInVehicle,
    clearResults
  };
} 