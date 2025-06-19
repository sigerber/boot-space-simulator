import { useState, useMemo } from 'react';
import { Item } from '../../types/item.types';
import { useItemSearch, useFilteredItems } from '../../hooks/useItemData';

interface ItemWithQuantity extends Item {
  quantity: number;
}

interface ItemSearchProps {
  items: Item[];
  selectedItems: ItemWithQuantity[];
  onItemAdd: (item: Item) => void;
  onItemRemove: (item: Item) => void;
  onQuantityChange: (item: Item, quantity: number) => void;
  loading?: boolean;
}

export function ItemSearch({ 
  items, 
  selectedItems, 
  onItemAdd, 
  onItemRemove, 
  onQuantityChange, 
  loading = false 
}: ItemSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Apply search and filters
  const searchedItems = useItemSearch(items, searchTerm);
  const filteredItems = useFilteredItems(searchedItems, categoryFilter.length > 0 ? categoryFilter : undefined);

  // Get available categories from all items
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    items.forEach(item => categories.add(item.category));
    return Array.from(categories).sort();
  }, [items]);

  const handleCategoryToggle = (category: string) => {
    setCategoryFilter(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getItemQuantity = (item: Item): number => {
    const selectedItem = selectedItems.find(si => si.name === item.name);
    return selectedItem?.quantity || 0;
  };

  const isItemSelected = (item: Item): boolean => {
    return getItemQuantity(item) > 0;
  };

  const formatDimensions = (item: Item): string => {
    const { length, width, height } = item.dimensions;
    return `${length}×${width}×${height}mm`;
  };

  const formatVolume = (item: Item): number => {
    const { length, width, height } = item.dimensions;
    return Math.round((length * width * height) / 1000000); // Convert mm³ to liters
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Add Items to Pack</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add Items to Pack</h2>
      
      {/* Selected Items Summary */}
      {selectedItems.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            Selected Items ({selectedItems.reduce((sum, item) => sum + item.quantity, 0)})
          </h3>
          <div className="space-y-2">
            {selectedItems.map(item => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <span className="text-blue-800">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onQuantityChange(item, Math.max(0, item.quantity - 1))}
                    className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 hover:bg-blue-300 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-blue-900 font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onQuantityChange(item, item.quantity + 1)}
                    className="w-6 h-6 rounded-full bg-blue-200 text-blue-800 hover:bg-blue-300 flex items-center justify-center"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onItemRemove(item)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Category Filters */}
      {availableCategories.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Category:</h3>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1 text-sm rounded-full border ${
                  categoryFilter.includes(category)
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {category.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} available
      </div>

      {/* Item List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items found matching your criteria
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className={`p-4 border rounded-lg transition-colors ${
                isItemSelected(item)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatDimensions(item)} • {formatVolume(item)}L • {item.weight}kg
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {item.category.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {item.rigidity.replace('_', ' ')}
                    </span>
                    {item.compressibility > 0 && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        {item.compressibility}% compressible
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isItemSelected(item) ? (
                    <>
                      <button
                        onClick={() => onQuantityChange(item, Math.max(0, getItemQuantity(item) - 1))}
                        className="w-8 h-8 rounded-full bg-green-200 text-green-800 hover:bg-green-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-green-900 font-medium w-8 text-center">{getItemQuantity(item)}</span>
                      <button
                        onClick={() => onQuantityChange(item, getItemQuantity(item) + 1)}
                        className="w-8 h-8 rounded-full bg-green-200 text-green-800 hover:bg-green-300 flex items-center justify-center"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onItemAdd(item)}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 