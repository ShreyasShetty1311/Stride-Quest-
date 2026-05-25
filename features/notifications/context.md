# Notifications & Beacons Feature Context

## 1. Feature Overview
The Notifications and Beacons module handles active alerts, threat warnings, and structural support beacons dispatched by allied runner agents.
- **Purpose**: Communicates warnings (e.g. sectors losing durability or under siege) to the player HUD, and allows dispatching specific support request signals (reinforcements, repairs, bug reports) to coordinate allied run efforts.

## 2. Components & Files
- [Dashboard.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/Dashboard.tsx): Renders the alert notification drawer, the settings menu options, and the Support Beacon dispatch forms modal.
- [Profile.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/Profile.tsx): Provides an additional "Dispatch Beacon" action inside the Security Chest, and renders the **Active Support Beacons** log ledger listing dispatched requests.
- [App.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/App.tsx): Manages centralized states `alerts` and `supportRequests`, exposing mutation callbacks (`handleAddSupportRequest`, `handleDeleteAlert`).

## 3. Functionality
- **Alert dismissal**: Dismissing an alert in the header notification drawer invokes `onDeleteAlert`, removing it from central memory.
- **Support Request Dispatching**: Dispatched support requests (from Dashboard settings or Profile Security Chest) invoke `onAddSupportRequest`. This action:
  1. Spawns a new `SupportRequest` record in memory.
  2. Spawns a "Support Beacon Active" notification alert in the header.
  3. Appends the active beacon log to the bottom of the Profile screen displaying status, timestamp, target sector, and descriptions.
  4. Triggers browser alerts confirming success.

## 4. Data Handling
- **Mock DB Schemas**: Uses `AlertNotification` and `SupportRequest` schemas defined in `mockDb.ts`.
- **Backend Schema Mapping**: Future server configurations will use tables for `alerts` and `support_requests` associated with `sector_id` and `user_id`.

## 5. Deployment Notes
- **State Propagation**: Handled through lifting state to `App.tsx`, avoiding context/state syncing lag after production builds.

## 6. Future Improvements
- **FCM Push Notifications**: Setting up push notifications so users receive siege/decay alerts even when the game client is closed.
- **Interactive Beacon Actions**: Allowing other online faction players to view dispatched beacons on the World Map and join defense runs for double XP multipliers.
