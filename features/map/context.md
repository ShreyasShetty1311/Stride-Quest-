# Map Feature Context

## 1. Feature Overview
The map feature is the central visual hub of Stride Quest, transforming real-world Bengaluru locations into a tactical gameplay overview.
- **Purpose**: Centers the game universe around Bengaluru, India, displaying active sectors, contested landmarks, and player coordinates.
- **Aesthetic**: Utilizes a dark-mode CartoDB tile service overlayed with blocky boundaries and pixel markers to match the Minecraft-inspired retro theme without sacrificing readability.

## 2. Components & Files
- [TacticalMap.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/TacticalMap.tsx): Holds Leaflet map initialization, center overlays, command scan bar, filter states, layer group management, and rendering handlers.
- [mockDb.ts](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/data/mockDb.ts): Stores static coordinates for landmarks (Vidhana Soudha,MG Road Metro, Ulsoor Lake, Indiranagar crossing) and initial user/sector data structures.
- [index.html](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/index.html): Imports Leaflet CSS styling directly from CDN to guarantee production bundle path stability.

## 3. Functionality
- **Map Initialization**: Centers on coordinates `[12.9716, 77.5946]` (Bengaluru center) at default city scale zoom `13`.
- **F3 Debug HUD**: Listens to map center movement events to dynamically recalculate coordinate offsets (XYZ) and update active biomes reactively in the HUD overlay.
- **Fly Navigation**: Submitting `/scan <landmark>` in the command chat input bar flies the map viewport smoothly to the targeted landmark coordinate at zoom level 15.
- **Toggled Filter Pills**: Allies, Rivals, and Neutral buttons at the bottom dynamically toggle layer groups (`alliesLayerGroup`, `rivalsLayerGroup`, `neutralLayerGroup`) using direct Leaflet layer insertions/removals.

## 4. Data Handling
- **Programmatic Zone Grid**: Generates 78 sector regions (polygons) programmatically around 19 coordinates/hotspots using a deterministic LCG pseudo-random seed generator. This ensures dense, high-fidelity city coverage without bloating bundle assets.
- **Dynamic Variations**: Skews polygon coordinate arrays slightly to create blocks of varying size, border weights, fill opacities, and dash boundaries matching threat levels.
- **Interactivity**: Attaches hover/click tooltips on each polygon displaying its active sector name and stats.

## 5. Deployment Notes
- **DivIcon Pins**: Uses Leaflet `divIcon` with inline SVGs instead of standard marker assets. This bypasses Vite URL bundling bugs that cause blank/missing markers after deployment.
- **CDN Styles**: Leaflet CSS stylesheet overrides are handled outside Vite CSS processing to prevent tiles alignment scrambled boxes in production build outputs.

## 6. Future Improvements
- **Real GPS Syncing**: Integrating the browser Geolocation API to sync player marker location to the active user position.
- **Real-Time Faction updates**: Fetching real-time sector polygon ownership boundaries from database servers via WebSockets.
