import { useState, useEffect } from 'react';
import { Item } from '../types/item.types';
import { validateItems, ValidationResult } from '../utils/dataValidation';

interface UseItemDataResult {
  items: Item[];
  loading: boolean;
  error: string | null;
  validationErrors: ValidationResult | null;
  reloadData: () => void;
}

/**
 * Custom hook for loading and managing item data
 */
export function useItemData(): UseItemDataResult {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors(null);

    try {
      const response = await fetch('/src/data/items.json');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate the loaded data
      const validation = validateItems(data);
      
      if (!validation.isValid) {
        setValidationErrors(validation);
        console.warn('Item data validation issues:', validation.errors);
        
        // Filter out invalid items but continue with valid ones
        const validItems = data.filter((_: any, index: number) => {
          const hasErrors = validation.errors.some(error => 
            error.field.startsWith(`items[${index}]`)
          );
          return !hasErrors;
        });
        
        if (validItems.length === 0) {
          throw new Error('No valid items found in data');
        }
        
        setItems(validItems);
      } else {
        setItems(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load item data';
      setError(errorMessage);
      console.error('Error loading item data:', err);
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
    items,
    loading,
    error,
    validationErrors,
    reloadData
  };
}

/**
 * Hook for filtering items by category
 */
export function useFilteredItems(items: Item[], categoryFilter?: string[]): Item[] {
  return items.filter(item => {
    if (!categoryFilter || categoryFilter.length === 0) {
      return true;
    }
    
    return categoryFilter.includes(item.category);
  });
}

/**
 * Hook for searching items by name
 */
export function useItemSearch(items: Item[], searchTerm: string): Item[] {
  if (!searchTerm.trim()) {
    return items;
  }

  const lowercaseSearch = searchTerm.toLowerCase();
  return items.filter(item =>
    item.name.toLowerCase().includes(lowercaseSearch)
  );
}

/**
 * Hook for filtering items by size constraints
 */
export function useItemSizeFilter(
  items: Item[], 
  maxLength?: number, 
  maxWidth?: number, 
  maxHeight?: number
): Item[] {
  return items.filter(item => {
    const { length, width, height } = item.dimensions;
    
    if (maxLength && length > maxLength) return false;
    if (maxWidth && width > maxWidth) return false;
    if (maxHeight && height > maxHeight) return false;
    
    return true;
  });
} 