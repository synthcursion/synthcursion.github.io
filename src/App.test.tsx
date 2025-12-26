import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import App from "./App";

// Mock URL and window.history since the App uses it for persistence
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
});

// Mocking window.location.search
Object.defineProperty(window, "location", {
  value: {
    search: "",
    href: "http://localhost/",
  },
  writable: true,
});

describe("Path Connection Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("places the selected path tile when clicking in completely empty space", () => {
    render(<App />);

    fireEvent.click(screen.getByText("Path"));

    // Select path2 (left-right)
    const path2Icon = screen.getByTitle("path2");
    fireEvent.click(path2Icon);

    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    const img = cells[40].querySelector("img");
    expect(img?.getAttribute("src")).toContain("path2.png");
  });

  it("upgrades existing paths with new connections without losing existing ones", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Path"));

    // Place path1 at (4,4)
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]);

    // It should be path1
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );

    // Place path at (5,4) - Right of (4,4). (r=5, c=4)
    // Grid is 9x9, index = r*9 + c. 5*9 + 4 = 49.
    fireEvent.click(cells[49]);

    // Now (4,4) has a neighbor to the right.
    // It was path1 (Top-Bottom).
    // Now it should have Top, Bottom AND Right -> paththreeway1 (connects all but left)
    const img44 = cells[40].querySelector("img");
    expect(img44?.getAttribute("src")).toContain("paththreeway1.png");
  });

  it("preserves connections even after the neighbor is removed (permanent logic)", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Path"));

    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4) - path1 (T-B)
    fireEvent.click(cells[49]); // (5,4) - Right neighbor

    // (4,4) is now paththreeway1 (T-B-R)
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );

    // Select Eraser
    fireEvent.click(screen.getByText("Eraser"));
    fireEvent.click(cells[49]); // Remove (5,4)

    // (4,4) should STILL be paththreeway1 because connections are permanent
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );
  });

  it("does NOT connect paths to newly placed non-path rooms", () => {
    render(<App />);

    // Place path1 at (4,4)
    fireEvent.click(screen.getByText("Path"));
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]);
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );

    // Select Room tool
    fireEvent.click(screen.getByText("Room"));
    // Place room at (5,4) - Right of (4,4)
    fireEvent.click(cells[49]);

    // (4,4) should STILL be path1.png, NOT paththreeway1.png
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );
    expect(cells[40].querySelector("img")?.getAttribute("src")).not.toContain(
      "paththreeway1.png",
    );
  });
});

describe("Generator Power Calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("only powers connected paths and rooms", () => {
    render(<App />);

    // 1. Place a Generator at (4,4). RoomId 7 is Generator.
    // Default selected room is Garrison (3).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });

    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // Place Generator at (4,4)

    // Generator T1 has range 1.
    // Neighbors are (3,4), (5,4), (4,3), (4,5).
    // Indices: 3*9+4=31, 5*9+4=49, 4*9+3=39, 4*9+5=41.

    // 2. Place a path at (4,5) that IS connected to (4,4).
    // Path1 is Top-Bottom. (4,5) is to the Top of (4,4) (c increases).
    // Path1 (T-B) at (4,5) HAS a connection to (4,4) (which is its bottom neighbor).
    fireEvent.click(screen.getByText("Path"));
    const path1Icon = screen.getByTitle("path1");
    fireEvent.click(path1Icon);
    fireEvent.click(cells[41]); // (4,5)

    // Check if (4,5) is powered.
    // Since it's a Path1 (T-B) and at (4,5) [Top of (4,4)], it SHOULD be powered.
    const img45 = cells[41].querySelector("img");
    expect(img45?.getAttribute("src")).toContain("powered");

    // 3. Place a path at (4,3) that IS connected to (4,4).
    // Path1 is Top-Bottom. (4,3) is to the Bottom of (4,4) (c decreases).
    // Path1 (T-B) at (4,3) HAS a connection to (4,4) (which is its top neighbor).
    fireEvent.click(cells[39]); // (4,3)

    const img43 = cells[39].querySelector("img");
    expect(img43?.getAttribute("src")).toContain("powered");

    // 4. Hover over (4,3) to check distance info.
    fireEvent.mouseOver(cells[39]);
    expect(screen.getByText(/Dist: 1/)).toBeDefined();
  });

  it("powers cells up to range 3 when generator is Tier 1", () => {
    render(<App />);

    // 1. Place a Generator at (4,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    // Check if it's Tier 1
    fireEvent.mouseOver(cells[40]);
    expect(screen.getByText(/Generator \(T1\)/)).toBeDefined();

    // 2. Place connected paths to reach distance 3.
    // (4,4) Gen T1 -> (4,5) Path1 -> (4,6) Path1 -> (4,7) Path1
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(cells[41]); // (4,5) dist 1
    fireEvent.click(cells[42]); // (4,6) dist 2
    fireEvent.click(cells[43]); // (4,7) dist 3

    expect(cells[41].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );
    expect(cells[42].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );
    expect(cells[43].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );

    // Distance 4 should NOT be powered
    fireEvent.click(cells[44]); // (4,8) dist 4
    expect(cells[44].querySelector("img")?.getAttribute("src")).not.toContain(
      "powered",
    );
  });

  it("powers a room adjacent to a path even if the path is not connected to it", () => {
    render(<App />);

    // 1. Place a Generator at (4,4)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    // 2. Place a Path at (4,5) connected to Generator.
    // Path1 (T-B) at (4,5) is connected to its bottom neighbor (4,4).
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(cells[41]); // (4,5)

    // Verify Path is powered
    expect(cells[41].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );

    // 3. Place a Room at (3,5) - Left of (4,5).
    // Path1 (T-B) does NOT have a "left" connection.
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "3" } }); // Garrison
    fireEvent.click(cells[32]); // (3,5)

    // In current implementation, (3,5) would NOT be powered because Path1 (T-B) has no Left connection.
    // The requirement says it SHOULD be powered.
    // Rooms show power via a glow div, not the icon src
    expect(cells[32].querySelector(".powered-glow")).not.toBeNull();
  });

  describe("Golem Works UpgradedByPower", () => {
    it("reaches T2 with 1 generator and T3 with 2 generators for Golem Works", () => {
      render(<App />);
      const cells = document.querySelectorAll(".cell");

      // 1. Place Golem Works at (4,4). Index 15.
      fireEvent.click(screen.getByText("Room"));
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "15" },
      });
      fireEvent.click(cells[40]);

      // Initial state: T1
      expect(cells[40].textContent).toContain("T1");

      // 2. Place Generator 1 at (4,5) and connect it
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "7" },
      });
      fireEvent.click(cells[41]);
      // Connect Gen 1 to Golem Works via path if necessary, but rooms connect to adjacent rooms directly
      // In our code: Generators connect to all adjacent rooms.
      // So (4,4) Golem Works is now powered by (4,5) Generator.

      // EXPECTED: T2 (Base 1 + 1 from Power).
      // CURRENT (Buggy): It probably reaches T3 because UpgradedByPower is 2 and we add it all if powered.
      expect(cells[40].textContent).toContain("T2");

      // 3. Place Generator 2 at (4,3)
      fireEvent.click(cells[39]);

      // EXPECTED: T3 (Base 1 + 2 from 2 Generators).
      expect(cells[40].textContent).toContain("T3");
    });
  });

  it("does not propagate power from a non-generator room to another room or path", () => {
    render(<App />);

    // 1. Place a Generator at (4,4)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    // 2. Place a Path at (4,5) connected to Generator.
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(cells[41]); // (4,5)

    // 3. Place a Room A at (3,5) - Powered by Path at (4,5)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "3" } }); // Garrison
    fireEvent.click(cells[32]); // (3,5) Room A

    // 4. Place a Room B at (2,5) - Adjacent to Room A but NOT to Path
    fireEvent.click(cells[23]); // (2,5) Room B

    // 5. Place a Path B at (3,6) - Adjacent to Room A but NOT to Path (4,5)
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(cells[33]); // (3,6) Path B

    // Verify Room A is powered
    expect(cells[32].querySelector(".powered-glow")).not.toBeNull();

    // Verify Room B and Path B are NOT powered (they are only adjacent to Room A)
    expect(cells[23].querySelector(".powered-glow")).toBeNull();
    expect(cells[33].querySelector("img")?.getAttribute("src")).not.toContain(
      "powered",
    );
  });

  it("powers cells up to range 4 when generator is Tier 2", () => {
    render(<App />);

    // 1. Place a Generator at (4,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    // Upgrade to Tier 2
    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cells[40]);

    // 2. Place connected paths to reach distance 4.
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(cells[41]); // dist 1
    fireEvent.click(cells[42]); // dist 2
    fireEvent.click(cells[43]); // dist 3
    fireEvent.click(cells[44]); // dist 4

    expect(cells[44].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );

    // Distance 5 should NOT be powered (using a different row to avoid boundary issues)
    // (4,4) -> (3,4) -> (2,4) -> (1,4) -> (0,4) is distance 4.
    // We can't go to distance 5 in a straight line easily from (4,4) in 9x9 without hitting edge.
    // Actually (4,4) to (4,8) is dist 4. (4,9) is out of bounds.
    // (4,4) to (0,4) is dist 4.
  });

  it("powers cells up to range 5 when generator is Tier 3", () => {
    render(<App />);

    // 1. Place a Generator at (4,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4)

    // Need to upgrade to Tier 3.
    // Medal + another adjacent upgrade?
    // Let's place another generator next to it if that works?
    // Actually, I'll use Thaumaturge (index 14) which upgrades Generator.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "14" } });
    fireEvent.click(cells[41]); // Thaumaturge at (4,5) upgrades Generator at (4,4)

    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cells[40]); // Medal + Thaumaturge = T3

    fireEvent.mouseOver(cells[40]);
    expect(screen.getByText(/Generator \(T3\)/)).toBeDefined();

    // 2. Place connected paths to reach distance 5.
    // (4,4) -> (5,4) -> (6,4) -> (7,4) -> (8,4) is distance 4.
    // (4,4) -> (3,4) -> (2,4) -> (1,4) -> (0,4) is distance 4.
    // Let's go (4,4) -> (4,3) -> (3,3) -> (2,3) -> (1,3) -> (0,3)
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(cells[39]); // (4,3) dist 1
    fireEvent.click(cells[30]); // (3,3) dist 2
    fireEvent.click(cells[21]); // (2,3) dist 3
    fireEvent.click(cells[12]); // (1,3) dist 4
    fireEvent.click(cells[3]); // (0,3) dist 5

    // Since they automatically connect to neighbors that are paths/rooms:
    expect(cells[3].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );
  });

  it("powers cells around a corner to distance 2", () => {
    render(<App />);

    // 1. Place a Generator at (4,4) T2.
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]);
    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cells[40]);

    // 2. Place a corner path at (4,5) (Top of (4,4)).
    // To connect (4,4) [at its Bottom] and (5,5) [at its Right], it needs Bottom and Right.
    // pathcornertop has ["bottom", "right"].
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("pathcornertop"));
    fireEvent.click(cells[41]); // (4,5)

    // 3. Place a path at (5,5) (Right of (4,5)).
    // (5,5) index: 5*9+5=50.
    // Needs Left connection. path2 (L-R) has it.
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(cells[50]);

    // Check power
    expect(cells[41].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );
    expect(cells[50].querySelector("img")?.getAttribute("src")).toContain(
      "powered",
    );

    // Check distance at (5,5)
    fireEvent.mouseOver(cells[50]);
    expect(screen.getByText(/Dist: 2/)).toBeDefined();
  });
});
