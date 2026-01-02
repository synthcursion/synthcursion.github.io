### Guidelines for Simulating Path of Exile 2 Incursion Mechanics

The primary purpose of this tool is to precisely simulate the **Incursion mechanic from Path of Exile 2**. All data structures and logic must strictly replicate the in-game behavior of the Temple of Atzoatl.

#### 1. Mechanical Precision & Data Lookup
- **Source of Truth**: The `src/data/generated/English.json` file contains the exact room and medallion definitions from the game. Use the `Incursion2Rooms` dictionary for $O(1)$ lookups by Room ID.
- **Rule Fidelity**: When implementing or modifying logic, ensure it matches the game's mechanics: if a room in the game would upgrade or convert based on its neighbors, the simulation must reflect that exactly.

#### 2. Replicating In-Game Room Relationships
- **Adjacency Logic**: The simulation uses 4-way adjacency (top, bottom, left, right) to trigger game mechanics.
- **Upgrades (`UpgradedBy`)**: 
  - A room’s tier increases if it is adjacent to a room ID listed in its `UpgradedBy` array. 
  - This replicates the game's "Empowering" or "Support" mechanics. Multiple adjacent matching rooms provide cumulative upgrades, mirroring how multiple instances of a room can boost a neighbor in-game.
- **Conversions (`ConvertedBy` & `ConvertedTo`)**:
  - These arrays are positional pairs that define the game's transformation rules. If a room is adjacent to `ConvertedBy[i]`, it must be transformed into `ConvertedTo[i]`.
  - Check for conversions iteratively (up to 5 passes) to handle "chain reactions" where one transformation enables another, as per the game's resolution logic.

#### 3. Room Tier and Level Constraints
- **Tier Limits**: Always cap room tiers at `MaxLevel` (usually 3). 
- **Indexing**: Access tier-specific data (Mods, Names) using `roomData.Levels[tier]`. Note that the game data is 1-indexed; index `0` is typically a null placeholder.

#### 4. Visual Connectivity as Functional Evidence
- **Connection Logic**: Visual links between rooms are not just aesthetic; they signify a mechanical interaction. Only create a room-to-room connection if:
  - An **Upgrade** or **Conversion** relationship exists between them.
  - One of the rooms is an **Architect's Chamber** (which interacts with all neighbors for medallion unlocks) or a **Boss Reward** room.
- **Pathways**: `IsPathway` rooms and corridors use permanent connection logic based on their orientation (see `src/utils/getConnections.ts`).

#### 5. Verification and Testing
- **Test Suite**: Always verify changes by running the test suite using `npm test`. 
- **Regression Testing**: Ensure that any changes to connection or upgrade logic do not break existing room interactions, which are heavily covered in the test files under `src/tests/`.

By following these guidelines, you ensure the simulator remains a high-fidelity tool that helps players plan their Incursion temples accurately.
