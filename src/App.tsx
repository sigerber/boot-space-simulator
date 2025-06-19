import { useState, useEffect } from 'react';
import { Vehicle } from './types/vehicle.types';
import { Item } from './types/item.types';
import { useVehicleData } from './hooks/useVehicleData';
import { useItemData } from './hooks/useItemData';
import { usePackingAlgorithm } from './hooks/usePackingAlgorithm';
import { CarSearch } from './components/search/CarSearch';
import { ItemSearch } from './components/search/ItemSearch';
import { PackingResults } from './components/results/PackingResults';

interface ItemWithQuantity extends Item {
  quantity: number;
}

function App() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedItems, setSelectedItems] = useState<ItemWithQuantity[]>([]);
  
  // Data loading hooks
  const { vehicles, loading: vehiclesLoading, error: vehiclesError } = useVehicleData();
  const { items, loading: itemsLoading, error: itemsError } = useItemData();
  
  // Packing algorithm hook
  const { packingResult, isLoading: packingLoading, error: packingError, packItemsInVehicle } = usePackingAlgorithm();

  // Auto-run packing when vehicle or items change
  useEffect(() => {
    if (selectedVehicle && selectedItems.length > 0) {
      // Convert ItemWithQuantity to regular Items with duplicates for each quantity
      const itemsTopack: Item[] = [];
      selectedItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
          itemsTopack.push({
            name: item.name,
            dimensions: item.dimensions,
            weight: item.weight,
            rigidity: item.rigidity,
            category: item.category,
            cabinSuitable: item.cabinSuitable,
            compressibility: item.compressibility,
            stackable: item.stackable,
            orientationConstraints: item.orientationConstraints,
            customItem: item.customItem
          });
        }
      });
      
      packItemsInVehicle(selectedVehicle, itemsTopack);
    }
  }, [selectedVehicle, selectedItems, packItemsInVehicle]);

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleItemAdd = (item: Item) => {
    setSelectedItems(prev => {
      const existing = prev.find(si => si.name === item.name);
      if (existing) {
        return prev.map(si => 
          si.name === item.name 
            ? { ...si, quantity: si.quantity + 1 }
            : si
        );
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const handleItemRemove = (item: Item) => {
    setSelectedItems(prev => prev.filter(si => si.name !== item.name));
  };

  const handleQuantityChange = (item: Item, quantity: number) => {
    if (quantity <= 0) {
      handleItemRemove(item);
      return;
    }
    
    setSelectedItems(prev => 
      prev.map(si => 
        si.name === item.name 
          ? { ...si, quantity }
          : si
      )
    );
  };

  const hasDataError = vehiclesError || itemsError;
  const isDataLoading = vehiclesLoading || itemsLoading;

  if (hasDataError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full mx-4">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-4">Data Loading Error</h2>
            <p className="text-sm mb-4">
              {vehiclesError || itemsError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bootspace Simulator
          </h1>
          <p className="text-gray-600">
            Determine if your luggage will fit in rental car boots with our packing algorithm.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-8">
            {/* Car Selection */}
            <CarSearch
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleSelect={handleVehicleSelect}
              loading={isDataLoading}
            />

            {/* Item Selection */}
            <ItemSearch
              items={items}
              selectedItems={selectedItems}
              onItemAdd={handleItemAdd}
              onItemRemove={handleItemRemove}
              onQuantityChange={handleQuantityChange}
              loading={isDataLoading}
            />
          </div>

          {/* Right Column - Results */}
          <div>
            <PackingResults
              vehicle={selectedVehicle}
              packingResult={packingResult}
              isLoading={packingLoading}
              error={packingError}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>
              Measurements are crowd-sourced and may not be 100% accurate. 
              Always verify critical dimensions before travel.
            </p>
            <p className="mt-2">
              Boot irregularities and packing efficiency estimates are included in calculations.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App; 