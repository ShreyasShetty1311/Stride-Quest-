# Biome Feature Context

## 1. Feature Overview
The Biome feature provides dynamic real-time environment detection based on player navigation coordinates, matching the wilderness exploration aspect of retro games.
- **Purpose**: Evaluates coordinates and updates the player's active biome context, which will affect step conversion multipliers, status effects, and quest loot types in future integrations.

## 2. Components & Files
- [TacticalMap.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/TacticalMap.tsx): Declares the `getBiomeName` calculator function and updates the F3 HUD on center coordination shifts.
- [ActiveSession.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/ActiveSession.tsx): Displays active biomes during telemetry quest sessions.

## 3. Functionality
- **Coordinate Evaluation**: The biome is calculated dynamically based on target latitude and longitude bounding boxes:
  - **Forest/Park (Cubbon)**: Within `lat [12.9660 - 12.9780]`, `lon [77.5860 - 77.5990]`.
  - **Lake/Wetland (Ulsoor)**: Within `lat [12.9740 - 12.9860]`, `lon [77.6080 - 77.6250]`.
  - **Urban/Street (Indira)**: Within `lat [12.9550 - 12.9760]`, `lon [77.6260 - 77.6460]`.
  - **Plains (BLR Suburbs)**: Default fallback for any other coordinates.
- **HUD Rendering**: Renders dynamically inside the F3 debug screen overlays.

## 4. Data Handling
- **Inputs**: Read-only map center coordinate values `coords.lat` and `coords.lon`.
- **Expected Backend Structure**: Future database integration will use GeoJSON layers stored in Postgres (PostGIS) to perform spatial intersection queries (`ST_Contains`) on sector boundary geometry.

## 5. Deployment Notes
- **Lighweight Client Calculation**: Handled completely on the client side using static bounding boxes, avoiding expensive HTTP server queries during maps panning and dragging.

## 6. Future Improvements
- **PostGIS Boundaries Lookup**: Replacing local bounding box checks with a server lookup supporting polygon geometry queries.
- **Step Multiplier Integration**: Adjusting player XP or quest rewards dynamically based on biome difficulty (e.g. running in Lake/Wetlands gives bonus tracking loot).
