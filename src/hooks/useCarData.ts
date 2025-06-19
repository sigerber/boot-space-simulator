import { useState, useEffect } from 'react';
import { Vehicle } from '../types/vehicle.types';
import { validateVehicles, ValidationResult } from '../utils/dataValidation';
import { transformVehicleData } from '../utils/dataTransforms';

interface UseVehicleDataResult {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  validationErrors: ValidationResult | null;
  reloadData: () => void;
}

/**
 * Custom hook for loading and managing vehicle data
 */
export function useVehicleData(): UseVehicleDataResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      // First try to load the existing sample data (properly formatted)
      let vehicleData: Vehicle[] = [];
      
      try {
        const response = await fetch('/src/data/vehicles.json');
        if (response.ok) {
          const data = await response.json();
          const validation = validateVehicles(data);
          
          if (validation.isValid) {
            vehicleData = data;
          } else {
            console.warn('Sample vehicle data validation failed:', validation.errors);
          }
        }
      } catch (error) {
        console.warn('Could not load sample vehicle data:', error);
      }

      // Then try to load and transform the comprehensive vehicles.json data
      try {
        const rawResponse = await fetch('/vehicles.json');
        if (rawResponse.ok) {
          const rawData = await rawResponse.json();
          const transformedData = transformVehicleData(rawData);
          const transformedValidation = validateVehicles(transformedData);
          
          if (transformedValidation.isValid) {
            // Merge with sample data, avoiding duplicates
            const existingMakeModels = new Set(vehicleData.map(v => v.makeModel));
            const newVehicles = transformedData.filter(v => !existingMakeModels.has(v.makeModel));
            vehicleData = [...vehicleData, ...newVehicles];
          } else {
            console.warn('Transformed vehicle data validation failed:', transformedValidation.errors);
            setValidationErrors(transformedValidation);
          }
        }
      } catch (transformError) {
        console.warn('Could not load raw vehicle data:', transformError);
      }

      if (vehicleData.length === 0) {
        throw new Error('No valid vehicle data could be loaded');
      }

      // Final validation of combined data
      const finalValidation = validateVehicles(vehicleData);
      if (!finalValidation.isValid) {
        setValidationErrors(finalValidation);
        console.warn('Final vehicle data validation issues:', finalValidation.errors);
      }

      setVehicles(vehicleData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vehicle data';
      setError(errorMessage);
      console.error('Error loading vehicle data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const reloadData = () => {
    loadData();
  };

  return {
    vehicles,
    loading,
    error,
    validationErrors,
    reloadData
  };
}

/**
 * Hook for filtering vehicles by category tags
 */
export function useFilteredVehicles(vehicles: Vehicle[], categoryFilter?: string[]): Vehicle[] {
  return vehicles.filter(vehicle => {
    if (!categoryFilter || categoryFilter.length === 0) {
      return true;
    }
    
    return categoryFilter.some(category => 
      vehicle.categoryTags.includes(category)
    );
  });
}

/**
 * Hook for searching vehicles by make/model
 */
export function useVehicleSearch(vehicles: Vehicle[], searchTerm: string): Vehicle[] {
  if (!searchTerm.trim()) {
    return vehicles;
  }

  const lowercaseSearch = searchTerm.toLowerCase();
  return vehicles.filter(vehicle =>
    vehicle.makeModel.toLowerCase().includes(lowercaseSearch)
  );
} 