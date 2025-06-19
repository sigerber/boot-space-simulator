import { useState, useMemo } from 'react';
import { Vehicle } from '../../types/vehicle.types';
import { useVehicleSearch, useFilteredVehicles } from '../../hooks/useVehicleData';

interface CarSearchProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onVehicleSelect: (vehicle: Vehicle) => void;
  loading?: boolean;
}

export function CarSearch({ vehicles, selectedVehicle, onVehicleSelect, loading = false }: CarSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  // Apply search and filters
  const searchedVehicles = useVehicleSearch(vehicles, searchTerm);
  const filteredVehicles = useFilteredVehicles(searchedVehicles, categoryFilter.length > 0 ? categoryFilter : undefined);

  // Get available categories from all vehicles
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    vehicles.forEach(vehicle => {
      vehicle.categoryTags.forEach(tag => categories.add(tag));
    });
    return Array.from(categories).sort();
  }, [vehicles]);

  const handleCategoryToggle = (category: string) => {
    setCategoryFilter(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const formatBootVolume = (vehicle: Vehicle) => {
    const volume = vehicle.bootMeasurements.length * vehicle.bootMeasurements.width * vehicle.bootMeasurements.height;
    return Math.round(volume / 1000000); // Convert mm³ to liters
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Select a Vehicle</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Select a Vehicle</h2>
      
      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by make or model..."
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
                    ? 'bg-blue-500 text-white border-blue-500'
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
        {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
      </div>

      {/* Vehicle List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No vehicles found matching your criteria
          </div>
        ) : (
          filteredVehicles.map((vehicle, index) => (
            <div
              key={`${vehicle.makeModel}-${index}`}
              onClick={() => onVehicleSelect(vehicle)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedVehicle?.makeModel === vehicle.makeModel
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{vehicle.makeModel}</h3>
                  <div className="text-sm text-gray-600 mt-1">
                    Boot: {vehicle.bootMeasurements.length}×{vehicle.bootMeasurements.width}×{vehicle.bootMeasurements.height}mm
                    ({formatBootVolume(vehicle)}L)
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {vehicle.categoryTags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="capitalize">{vehicle.measurementConfidence}</div>
                  {vehicle.bootIrregularities.length > 0 && (
                    <div className="text-orange-600 mt-1">⚠ {vehicle.bootIrregularities.length} irregularity/ies</div>
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