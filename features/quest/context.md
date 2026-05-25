# Quest Telemetry Feature Context

## 1. Feature Overview
The Quest module tracks active fitness runs, conversion rates, and GPS coordinate tracking.
- **Purpose**: Translates physical travel metrics (steps, paces, distance) into spatial coordinates and active Redstone trails inside a dedicated tracking overlay, gamifying jogging into tactical territory conquests.

## 2. Components & Files
- [ActiveSession.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/ActiveSession.tsx): Fullscreen active conquest overlay containing the Leaflet tracking map, GPS loop polylines, and dynamic telemetry ticker labels.
- [App.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/App.tsx): Contains `startSession` and `stopSession` handlers, rewarding XP/stamina, adding recent conquest logs, and dispatching completion notifications.

## 3. Functionality
- **Telemetry Ticks**: While active, the session updates duration, pace, calculated calories, altitude, and total run distance metrics periodically.
- **Redstone GPS Polyline**: Renders a custom styled red polyline trail on the map, representing a run circuit around Cubbon Park.
- **Pulsing Player Beacon**: Simulates user navigation by advancing a glowing green diamond pointer along the polyline path index ticks.
- **Quest Pause**: The Pause/Resume button toggles the active interval timers, halting/resuming GPS loop updates and workout telemetry calculations.
- **Quest Completion**: Clicking "Stop Quest" saves conquest loot details, awards XP and stamina levels, and posts success notifications.

## 4. Data Handling
- **Mock GPS Paths**: Hardcoded array of coordinate rings simulating allied route paths.
- **Fitness Data API Integration**: Future integrations will fetch step/pace data directly from mobile device health services (Apple HealthKit / Google Fit).

## 5. Deployment Notes
- **Leaflet Dimensions Override**: Telemetry maps inside the active overlay are sized to avoid Leaflet container loading issues in mobile viewports.

## 6. Future Improvements
- **Real GPS Polyline Drawing**: Drawing coordinate polylines dynamically using live device geolocation data streams during the run.
- **Heart Rate Integration**: Syncing heart rate sensors via Bluetooth Web API.
