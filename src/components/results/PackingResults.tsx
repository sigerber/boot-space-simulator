// Component for displaying packing algorithm results
import { Vehicle } from '../../types/vehicle.types';
import { PackingResult, PackedItem } from '../../utils/packingAlgorithm';
import { BootVisualization } from '../visualization/BootVisualization';

interface PackingResultsProps {
  vehicle: Vehicle | null;
  packingResult: PackingResult | null;
  isLoading: boolean;
  error: string | null;
}

export function PackingResults({ vehicle, packingResult, isLoading, error }: PackingResultsProps) {
  if (!vehicle) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Packing Results</h2>
        <div className="text-center py-8 text-gray-500">
          Select a vehicle and add items to see packing results
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Packing Results</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-6 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Packing Results</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 font-medium">Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!packingResult) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Packing Results</h2>
        <div className="text-center py-8 text-gray-500">
          Add some items to see how they pack
        </div>
      </div>
    );
  }

  const getStatusColor = (utilization: number) => {
    if (utilization > 80) return 'text-red-600';
    if (utilization > 60) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusIcon = (utilization: number) => {
    if (utilization > 80) return '⚠️';
    if (utilization > 60) return '⚡';
    return '✅';
  };

  const formatPosition = (position: { x: number; y: number; z: number }) => {
    return `(${position.x}, ${position.y}, ${position.z})`;
  };

  const formatDimensions = (dimensions: { length: number; width: number; height: number }) => {
    return `${dimensions.length}×${dimensions.width}×${dimensions.height}mm`;
  };

  return (
    <div className="space-y-6">
      {/* 3D Visualization */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">3D Boot Visualization</h2>
        <BootVisualization 
          vehicle={vehicle}
          packingResult={packingResult}
        />
      </div>

      {/* Detailed Results */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Packing Details</h2>
        
        {/* Vehicle Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">{vehicle.makeModel}</h3>
        <div className="text-sm text-gray-600">
          Boot Space: {vehicle.bootMeasurements.length}×{vehicle.bootMeasurements.width}×{vehicle.bootMeasurements.height}mm
          ({Math.round((vehicle.bootMeasurements.length * vehicle.bootMeasurements.width * vehicle.bootMeasurements.height) / 1000000)}L)
        </div>
        {vehicle.bootIrregularities.length > 0 && (
          <div className="text-sm text-orange-600 mt-1">
            ⚠️ {vehicle.bootIrregularities.length} boot irregularity/ies affecting packing efficiency
          </div>
        )}
      </div>

      {/* Overall Status */}
      <div className="mb-6">
        <div className={`text-2xl font-bold ${getStatusColor(packingResult.volumeUtilization)}`}>
          {getStatusIcon(packingResult.volumeUtilization)} {packingResult.volumeUtilization.toFixed(1)}% Boot Utilization
        </div>
        <div className="text-gray-600 mt-1">
          {packingResult.packedItems.length} items packed, {packingResult.unpackedItems.length} items couldn't fit
        </div>
      </div>

      {/* Packed Items */}
      {packingResult.packedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">✅ Successfully Packed Items</h3>
          <div className="space-y-2">
            {packingResult.packedItems.map((packedItem: PackedItem, index: number) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-green-900">{packedItem.item.name}</div>
                    <div className="text-sm text-green-700 mt-1">
                      Position: {formatPosition(packedItem.position)} • 
                      Dimensions: {formatDimensions(packedItem.orientation)}
                      {packedItem.compressed && (
                        <span className="ml-2 text-orange-600">
                          (Compressed {packedItem.compressionApplied.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-green-600">
                    {Math.round((packedItem.orientation.length * packedItem.orientation.width * packedItem.orientation.height) / 1000000)}L
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpacked Items */}
      {packingResult.unpackedItems.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">❌ Items That Don't Fit</h3>
          <div className="space-y-2">
            {packingResult.unpackedItems.map((item, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-red-900">{item.name}</div>
                    <div className="text-sm text-red-700 mt-1">
                      Dimensions: {formatDimensions(item.dimensions)} • {item.weight}kg
                    </div>
                  </div>
                  <div className="text-sm text-red-600">
                    {Math.round((item.dimensions.length * item.dimensions.width * item.dimensions.height) / 1000000)}L
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabin Overflow Suggestions */}
      {packingResult.cabinOverflowSuggested.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">💡 Cabin Overflow Suggestions</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm text-blue-800 mb-2">
              These items could potentially fit in cabin spaces:
            </div>
            <div className="space-y-1">
              {packingResult.cabinOverflowSuggested.map((item, index) => (
                <div key={index} className="text-sm text-blue-700">
                  • {item.name} ({formatDimensions(item.dimensions)})
                </div>
              ))}
            </div>
            <div className="text-xs text-blue-600 mt-3">
              ⚠️ Note: Cabin placement may affect passenger comfort and safety. Check local regulations.
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {packingResult.warnings.length > 0 && (
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-3">⚠️ Warnings</h3>
          <div className="space-y-2">
            {packingResult.warnings.map((warning, index) => (
              <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">{warning}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Space Summary */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="font-medium text-gray-900">Boot Space Used</div>
          <div className="text-gray-600">{packingResult.bootSpaceUsed.toFixed(1)}L</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="font-medium text-gray-900">Boot Space Available</div>
          <div className="text-gray-600">{packingResult.bootSpaceAvailable.toFixed(1)}L total</div>
        </div>
      </div>
      </div>
    </div>
  );
} 