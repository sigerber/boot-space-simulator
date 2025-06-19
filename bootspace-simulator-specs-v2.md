# Bootspace Simulator Specifications

## Overview
A tool to help travelers determine if their luggage will fit in rental car boots, with simple 3D visualization and crowd-sourced measurements.

**Initial Deployment**: This tool will first be developed as a locally-run application for personal use. The architecture and technology choices support easy transition to a hosted web application in the future (potentially ad-supported).

## Technology Stack
- Frontend: React with TypeScript
- 3D Visualization: Three.js
- Styling: Tailwind CSS
- State Management: React Context API
- Build Tool: Vite
- Testing: Jest + React Testing Library
- Data Storage: JSON files in /data directory initially

**Note**: This stack is chosen to work both locally (file:// protocol) and as a hosted application without changes. No backend dependencies ensures easy personal use.

## Project Structure
```
/src
  /components
    /visualization
      BootVisualization.tsx
      ItemPlacer.tsx
    /search
      CarSearch.tsx
      ItemSearch.tsx
    /results
      PackingResults.tsx
      CompatibleCars.tsx
  /hooks
    usePackingAlgorithm.ts
    useVehicleData.ts
  /utils
    packingAlgorithm.ts
    volumeCalculations.ts
  /types
    vehicle.types.ts
    item.types.ts
  /data
    vehicles.json
    items.json
```

## Core Functionality

### Primary Features
- Compare multiple car models to find one that fits user's luggage
- Test if specific items fit in a selected car
- Auto-packing algorithm with 3D visualization
- Cabin overflow suggestions when boot space insufficient
- Crowd-sourced measurement database

## Data Models

### Enums

#### Boot Irregularity Severity
```
enum IrregularitySeverity {
  MINOR = "minor",          // Minimal impact on packing
  MODERATE = "moderate",    // Some impact on packing efficiency  
  SIGNIFICANT = "significant" // Major impact on packing efficiency
}
```

#### Item Rigidity
```
enum ItemRigidity {
  VERY_FLEXIBLE = "very_flexible",     // Can compress significantly
  FLEXIBLE = "flexible",               // Some compression possible
  SEMI_RIGID = "semi_rigid",          // Limited compression
  RIGID = "rigid",                    // Minimal compression
  COMPLETELY_RIGID = "completely_rigid" // No compression possible
}
```

### Vehicle Model
```
{
  "makeModel": "Toyota Corolla 2023",
  "categoryTags": ["sedan", "compact", "rental_common"],
  "bootMeasurements": {
    "length": 1000,  // mm, back to front
    "width": 1000,   // mm, at narrowest point
    "height": 500,   // mm, floor to parcel shelf
    "openingWidth": 950,    // if different from internal
    "openingHeight": 450    // if different from internal
  },
  "bootIrregularities": [
    {
      "type": "wheel_wells",  // Options: wheel_wells, spare_tire_bump, sloped_floor, narrow_opening, side_storage
      "severity": "moderate"  // Options: minor, moderate, significant
    }
  ],
  "cabinOverflowSpaces": {
    "rearFloor": {
      "length": 300,
      "width": 400,
      "height": 200
    },
    "rearSeatGap": {      // when middle seat empty
      "width": 200,
      "height": 300
    },
    "frontPassengerFloor": {
      "length": 350,
      "width": 300,
      "height": 250
    }
  },
  "measurementConfidence": "verified",  // manufacturer | verified | user_submitted
  "submissionCount": 5,
  "lastUpdated": "2024-01-15"
}
```

### Item Model
```
{
  "name": "Large Suitcase",
  "dimensions": {
    "length": 750,
    "width": 500,
    "height": 300
  },
  "weight": 15,  // kg
  "rigidity": "rigid",  // Options: very_flexible, flexible, semi_rigid, rigid, completely_rigid
  "category": "luggage",  // luggage | baby_gear | sports | shopping | equipment | custom
  "cabinSuitable": true,
  "compressibility": 10,  // percentage, 0-30%
  "stackable": true,
  "orientationConstraints": "any",  // any | upright_only | flat_only
  "customItem": false
}
```

## Data Validation

### Vehicles
- All dimensions must be positive integers (mm)
- Boot dimensions must be larger than 200x200x200mm
- Opening dimensions cannot exceed internal dimensions

### Items
- Dimensions must be positive integers
- Compressibility: 0-30% maximum
- Weight: 0.1-50kg range
- Rigidity: Must use ItemRigidity enum values
- Severity: Must use IrregularitySeverity enum values
- Custom items require all fields

## Measurement Guidelines

### For Vehicle Contributors
1. **Boot Measurements:**
   - Measure at floor level, excluding wheel wells
   - Use narrowest points for width
   - Measure height to parcel shelf or tonneau cover
   - Photograph measurement points

2. **Irregularity Documentation:**
   - Photo of wheel wells with ruler
   - Note spare tire location if visible
   - Mark any fixed protrusions

3. **Cabin Measurements:**
   - Only measure usable spaces
   - Consider seat belt buckle positions
   - Note if measurements taken with seats in normal position

### For Item Contributors
1. **Standard Items:**
   - Measure at widest points including handles/wheels
   - For soft items, provide both full and compressed dimensions

2. **Documentation:**
   - Note brand/model for common items

## Auto-Packing Algorithm

### Core Logic
1. **Pre-processing:**
   - Calculate adjusted boot volume based on irregularities
   - Sort items by volume (largest first) and rigidity (rigid first)
   - Apply compression to soft items if needed

2. **Packing Strategy:**
   - Try largest items first
   - Test all 6 orientations for each item
   - Stack lighter items on heavier ones
   - Reserve irregular spaces for flexible items

3. **Efficiency Factors:**
   - Regular boot: 85% volume utilization
   - Minor irregularities: 80% utilization
   - Major irregularities: 70% utilization
   - Apply compressibility only when necessary

### Packing Algorithm Implementation
- Use a 3D bin packing approach (First Fit Decreasing)
- Represent boot space as a 3D grid with 10mm resolution
- Items should be placed from back to front, bottom to top
- Return both the placement coordinates and rotation for each item
- Algorithm should return intermediate states for animation

### Cabin Overflow Logic
```
if (bootPackingFails) {
  candidateItems = items.filter(item => 
    item.cabinSuitable && 
    (item.rigidity === ItemRigidity.VERY_FLEXIBLE || 
     item.rigidity === ItemRigidity.FLEXIBLE || 
     item.rigidity === ItemRigidity.SEMI_RIGID) &&
    fitsInAnyCabinSpace(item)
  );
  
  // Try moving smallest suitable items first
  // Recalculate boot packing
  // Show warning about loose items
}
```

## Key Component Interfaces

### BootVisualization
- Props: vehicleData, packedItems, highlightedItem
- Behaviors: Rotate view, zoom, highlight item on hover

### PackingAlgorithm
- Input: bootDimensions, items[], irregularities[]
- Output: 
```
{
  packedItems: [{item, position, rotation, compressionApplied}],
  unpackedItems: [],
  utilization: number,
  cabinSuggestions: []
}
```

## User Interface Requirements

### Input Flows

#### Car-First Flow
1. Search/browse car models
2. Filter by tags or boot size
3. Select car
4. Add items to packing list
5. View packing result

#### Items-First Flow
1. Build packing list (preset items + custom)
2. Set number of each item
3. View compatible cars
4. Filter results by rental category

### 3D Visualization
- **Boot representation:**
  - Wireframe box with dimensions
  - Shaded areas for irregularities
  - Color-coded packed items
  
- **Color scheme:**
  - Green: Fits with >20% space remaining
  - Yellow: Fits with <20% space remaining
  - Orange: Requires compression
  - Red: Doesn't fit
  - Blue: Suggested for cabin placement

- **Views:**
  - Top-down primary view
  - Side view toggle
  - Utilization percentage display
  - Item list with placement indicators

### 3D Visualization Specifications
- Use orthographic camera for accurate representation
- Grid lines every 100mm
- Semi-transparent items when overlapping
- Animate item placement (300ms duration)
- Show dimension labels on hover

### Results Display
```
Toyota Corolla 2023
✓ Fits with room to spare (72% boot utilization)

Boot items:
- Large suitcase ✓
- Medium suitcase ✓
- Carry-on bag ✓

Cabin overflow suggested:
- Duffel bag → Rear floor space

⚠️ Note: This vehicle has wheel wells that reduce packing space
```

### UI/UX Requirements
- Mobile responsive (breakpoint at 768px)
- Keyboard navigation support
- Loading states for all async operations
- Tooltips for dimension inputs
- Drag-and-drop for item reordering
- Touch gestures for 3D view on mobile

## Additional Features

### Search & Filter
- **Car filters:**
  - Category (sedan, SUV, etc.)
  - Minimum boot volume
  - Irregularity tolerance

- **Item filters:**
  - Category
  - Size range
  - Preset vs custom

### Saved Configurations

## Error Handling
- Invalid dimensions: Show inline validation errors
- No fitting solution: Provide specific reasons (too big, too many items)
- Missing data: Graceful fallbacks with explanatory messages
- Data parsing errors: Log to console, show user-friendly message

## Performance Requirements
- Packing algorithm must complete within 500ms for up to 20 items
- Use Web Workers for algorithm if computation exceeds 100ms
- 3D visualization should maintain 30+ FPS
- Implement view frustum culling for large item sets

## Initial Data Requirements

### Vehicles
Include 10 common rental cars:
- Toyota Corolla, Honda Civic (sedans)
- Toyota RAV4, Honda CR-V (SUVs)
- Ford Explorer, Chevrolet Tahoe (large SUVs)
- Toyota Sienna, Honda Odyssey (minivans)
- Nissan Versa, Hyundai Accent (economy)

### Items
Include 15 common items:
- Large suitcase (750x500x300mm)
- Medium suitcase (650x450x250mm)
- Small suitcase (550x400x200mm)
- Carry-on bag (550x350x230mm)
- Duffel bag (600x300x300mm)
- Backpack (450x300x200mm)
- Standard stroller (1050x600x300mm folded)
- Compact stroller (850x450x250mm folded)
- Pack-n-play (800x800x150mm folded)
- Golf bag (1200x350x250mm)
- Cooler (large) (600x400x400mm)
- Cooler (small) (400x300x300mm)
- Shopping bags (400x300x150mm)
- Car seat (450x450x650mm)
- Sports equipment bag (900x300x300mm)

## Data Management
- For the initial cut data will be validated by hand
- No database to begin with. Measurements read off JSON files from disk
- Local-only storage in first version (no user accounts or cloud sync)
- Data files can be easily shared or version controlled

## Deployment Strategy

### Phase 1: Local Application (Current Focus)
- Runs entirely in browser from local files
- No server required - open index.html directly
- All data stored in local JSON files
- Can be shared as a zip file or git repository
- Personal use for trip planning

### Phase 2: Hosted Version (Future)
- Deploy as static site (Netlify, Vercel, GitHub Pages)
- Add analytics to understand usage patterns
- Consider ad support (non-intrusive banner ads)
- Progressive Web App for offline use
- User accounts for saving configurations
- Community-submitted measurements with moderation

## Technical Considerations

### Algorithm Complexity
- O(n! × 6) worst case for n items (all orientations)
- Optimization: Early termination when good fit found
- Caching: Store successful configurations

### Data Validation
- Dimension sanity checks (boot larger than biggest item)
- Automatic flagging of outlier measurements

## Testing Requirements
- Unit tests for packing algorithm with edge cases
- Component tests for all major UI components
- Integration test for complete packing flow
- Test data: Include "impossible" scenarios

## Implementation Phases

### Phase 1: Core algorithm and data models
- Set up TypeScript interfaces for vehicles and items
- Implement basic packing algorithm
- Create test suite for algorithm
- Load and validate JSON data

### Phase 2: Basic UI with manual item entry
- Create car selection interface
- Build item list management
- Display basic packing results
- Implement car-first and items-first flows

### Phase 3: 3D visualization
- Set up Three.js scene
- Render boot space with dimensions
- Visualize packed items
- Add camera controls and item highlighting

### Phase 4: Search and filtering
- Implement car search/filter
- Add item category filters
- Build results sorting

### Phase 5: Cabin overflow logic
- Add cabin space calculations
- Implement overflow suggestions
- Update UI to show cabin placements

### Phase 6: Polish and optimizations
- Performance optimization
- Mobile responsiveness
- Accessibility improvements
- Final testing and bug fixes

## Future Enhancements

### For Local Version
- Import/export packing configurations
- Local storage of favorite car/item combinations
- Offline-first PWA capabilities

### For Hosted Version
- User accounts with saved configurations
- Share configurations via link
- Community measurement submissions with moderation system
- Automated validation of user suggestions
- Database persistence (PostgreSQL or similar)
- Compare saved configs across cars
- Ad integration (respecting user experience)
- API for rental car companies to integrate
- Mobile app versions