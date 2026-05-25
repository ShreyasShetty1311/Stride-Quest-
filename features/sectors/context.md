# Sectors & Fortification Feature Context

## 1. Feature Overview
The Sectors and Fortification module tracks territory ownership, Allied/Rival sector health decay, and reinforcement systems.
- **Purpose**: Displays captured Allied boundaries and Contested Rivals/Neutral nodes, permitting players to expend collected Stamina to reinforce allied defenses.

## 2. Components & Files
- [TerritoryView.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/TerritoryView.tsx): Displays overall statistics (total captures, allied chunks, active sieges) and renders list cards for Allied, Contested, and Neutral sectors.
- [App.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/App.tsx): Holds global state arrays `sectors` and player stamina stats, and exposes the `handleFortifySector` mutator callback.
- [mockDb.ts](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/data/mockDb.ts): Defines `Sector` schemas and initial dataset matching Bengaluru sectors (Sector 7G, Sunset Heights, Ulsoor Lake).

## 3. Functionality
- **Fortification Action**: Reinforcing a sector costs `1 HP (Stamina)`. If player stamina is `0`, a alert dialog informs the player to complete runs to regenerate stamina. If stamina is available, the action:
  1. Increments sector health durability by `+10%` (capped at 100%).
  2. Decrements player stamina by `-1 HP`.
  3. Increments player defense armor by `+1 AP`.
  4. Removes wither/decay status effects from the sector if durability rises above 90%.
  5. Posts success notifications.
- **Interactive details**: Clicking sector cards displays detailed information overlays detailing biome effects, active logs, and coordinates.

## 4. Data Handling
- **Global Persistence**: Sector stats are stored in the root `App.tsx` state so durability modifications persist when navigating between different menus.
- **Backend Syncing**: Future server endpoints will verify stamina balances before writing updates to the databases.

## 5. Deployment Notes
- **State Preservation**: Because state is managed at the root component, sector fortifications are reflected instantly on the World Map layer groups.

## 6. Future Improvements
- **Automated Durability Decay**: Spawning client cron jobs or database triggers to decay sector health durability gradually over time (e.g. 5% decay per hour).
- **Rival Attacks**: Spawning automated siege alerts where rivals contest allied zones, requiring active defensive runs to maintain sector control.
