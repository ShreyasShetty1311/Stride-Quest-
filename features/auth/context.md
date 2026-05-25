# Auth & Identity Feature Context

## 1. Feature Overview
The Auth and Identity module handles local player profiling, credentials modification, and username forging.
- **Purpose**: Authenticates players to their factions and permits them to alter identifier tags (usernames) and forge secure seed keys in an gamified Anvil/Crafting style interface.

## 2. Components & Files
- [Profile.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/screens/Profile.tsx): Houses character status, equipment cards, inventory grids, updating form panels, and credentials alter modals.
- [App.tsx](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/App.tsx): Holds global `user` state and passes down the `onUpdateUser` mutation callback.
- [mockDb.ts](file:///Users/priyanshusharan/Downloads/Stride-Quest--main/src/data/mockDb.ts): Declares `UserProfile` and `GearItem` interfaces and initializes initial player attributes.

## 3. Functionality
- **Anvil Rename UI**: Updating the username triggers an "Enchantment Cost: 1 XP Level" visual rename form. Submitting renames the character and propagates changes instantly to the Dashboard and headers because the state is held globally.
- **Security Seed alterations**: The "Alter Security Code" form accepts current passwords and updates the cryptographic private seed code (`mockPassword`) upon forging.
- **Identity Decryptor**: Exposes private seed information by mapping username tags to lowercase decryption IDs.

## 4. Data Handling
- **Mock DB Persistence**: Changes mutate the global React `user` state. Because the state is held in `App.tsx`, changes persist when navigating between different tabs (Quest Log, World Map, Inventory).
- **Production Integration**: Mock user states will be wired to actual database users, and mutation calls will execute API requests to update database records.

## 5. Deployment Notes
- **Local Persistence**: State resets on window reload. LocalStorage integration can be used to persist profiles locally during offline previewing.

## 6. Future Improvements
- **Firebase Auth Setup**: Integrating email/password and google authentication.
- **Real XP levels check**: Linking name updates to actual XP level deductions inside the character data ledger.
