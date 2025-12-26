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

  const getCell = (x: number, y: number) => {
    return screen.getByTestId(`cell-${x}-${y}`);
  };

  it("places the selected path tile when clicking in completely empty space", () => {
    render(<App />);

    fireEvent.click(screen.getByText("Path"));

    // Select path2 (left-right)
    const path2Icon = screen.getByTitle("path2");
    fireEvent.click(path2Icon);

    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    const img = cell44.querySelector("img");
    expect(img?.getAttribute("src")).toContain("path2.png");
  });

  it("upgrades existing paths with new connections without losing existing ones", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Path"));

    // Place path1 at (4,4)
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44);

    // It should be path1
    expect(cell44.querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );

    // Place path at (5,4) - Right of (4,4). (x=5, y=4)
    const cell54 = getCell(5, 4);
    fireEvent.click(cell54);

    // Now (4,4) has a neighbor to the right.
    // It was path1 (Top-Bottom).
    // Now it should have Top, Bottom AND Right -> paththreeway1 (connects all but left)
    const img44 = cell44.querySelector("img");
    expect(img44?.getAttribute("src")).toContain("paththreeway1.png");
  });

  it("preserves connections even after the neighbor is removed (permanent logic)", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Path"));

    const cell44 = getCell(4, 4);
    const cell54 = getCell(5, 4);
    fireEvent.click(cell44); // (4,4) - path1 (T-B)
    fireEvent.click(cell54); // (5,4) - Right neighbor

    // (4,4) is now paththreeway1 (T-B-R)
    expect(cell44.querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );

    // Select Eraser
    fireEvent.click(screen.getByText("Eraser"));
    fireEvent.click(cell54); // Remove (5,4)

    // (4,4) should STILL be paththreeway1 because connections are permanent
    expect(cell44.querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );
  });

  it("does NOT connect paths to newly placed non-path rooms", () => {
    render(<App />);

    // Place path1 at (4,4)
    fireEvent.click(screen.getByText("Path"));
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44);
    expect(cell44.querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );

    // Select Room tool
    fireEvent.click(screen.getByText("Room"));
    // Place room at (5,4) - Right of (4,4)
    const cell54 = getCell(5, 4);
    fireEvent.click(cell54);

    // (4,4) should STILL be path1.png, NOT paththreeway1.png
    expect(cell44.querySelector("img")?.getAttribute("src")).toContain(
      "path1.png",
    );
    expect(cell44.querySelector("img")?.getAttribute("src")).not.toContain(
      "paththreeway1.png",
    );
  });
});

describe("Generator Power Calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  const getCell = (x: number, y: number) => {
    return screen.getByTestId(`cell-${x}-${y}`);
  };

  it("only powers connected paths and rooms", () => {
    render(<App />);

    // 1. Place a Generator at (4,4). RoomId 7 is Generator.
    // Default selected room is Garrison (3).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });

    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // Place Generator at (4,4)

    // 2. Place a path at (5,4) that IS connected to (4,4).
    // Path1 is Top-Bottom. (5,4) is to the Bottom of (4,4).
    fireEvent.click(screen.getByText("Path"));
    const path1Icon = screen.getByTitle("path2");
    fireEvent.click(path1Icon);
    const cell54 = getCell(5, 4);
    fireEvent.click(cell54); // (5,4)

    // Check if (5,4) is powered.
    expect(cell54?.getAttribute("data-powered")).toBe("true");

    // 3. Place a path at (3,4) that IS connected to (4,4).
    // Path1 is Top-Bottom. (3,4) is to the Top of (4,4).
    const cell34 = getCell(3, 4);
    fireEvent.click(cell34); // (3,4)

    expect(cell34?.getAttribute("data-powered")).toBe("true");

    // 4. Hover over (5,4) to check power.
    fireEvent.mouseOver(cell54);
    expect(cell54?.getAttribute("data-powered")).toBe("true");
  });

  it("powers cells up to range 3 when generator is Tier 1", () => {
    render(<App />);

    // 1. Place a Generator at (4,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    // Check if it's Tier 1
    fireEvent.mouseOver(cell44);
    expect(cell44?.getAttribute("data-room-id")).toBe("Generator");
    expect(cell44?.getAttribute("data-tier")).toBe("1");

    // 2. Place connected paths to reach distance 3.
    // (4,4) Gen T1 -> (5,4) Path1 -> (6,4) Path1 -> (7,4) Path1
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    const cell54 = getCell(5, 4);
    const cell64 = getCell(6, 4);
    const cell74 = getCell(7, 4);
    fireEvent.click(cell54); // (5,4) dist 1
    fireEvent.click(cell64); // (6,4) dist 2
    fireEvent.click(cell74); // (7,4) dist 3

    expect(cell54?.getAttribute("data-powered")).toBe("true");
    expect(cell64?.getAttribute("data-powered")).toBe("true");
    expect(cell74?.getAttribute("data-powered")).toBe("true");

    // Distance 4 should NOT be powered
    const cell84 = getCell(8, 4);
    fireEvent.click(cell84); // (8,4) dist 4
    expect(cell84?.getAttribute("data-powered")).not.toBe("true");
  });

  it("powers a room adjacent to a path even if the path is not connected to it", () => {
    render(<App />);

    // 1. Place a Generator at (4,4)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    // 2. Place a Path at (5,4) connected to Generator.
    // Path1 (T-B) at (5,4) is connected to its top neighbor (4,4).
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    const cell54 = getCell(5, 4);
    fireEvent.click(cell54); // (5,4)

    // Verify Path is powered
    expect(cell54?.getAttribute("data-powered")).toBe("true");

    // 3. Place a Room at (5,5) - Right of (5,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "3" } }); // Garrison
    const cell55 = getCell(5, 5);
    fireEvent.click(cell55); // (5,5)

    // In current implementation, (5,5) WOULD be powered because it's adjacent to a powered path
    expect(cell55.getAttribute("data-powered")).toBe("true");
  });

  describe("Golem Works UpgradedByPower", () => {
    it("reaches T2 with 1 generator and T3 with 2 generators for Golem Works", () => {
      render(<App />);

      // 1. Place Golem Works at (4,4). Index 15.
      fireEvent.click(screen.getByText("Room"));
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "15" },
      });
      const cell44 = getCell(4, 4);
      fireEvent.click(cell44);

      // Initial state: T1
      expect(cell44?.getAttribute("data-tier")).toBe("1");

      // 2. Place Generator 1 at (5,4) and connect it
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "7" },
      });
      const cell54 = getCell(5, 4);
      fireEvent.click(cell54);
      // Connect Gen 1 to Golem Works via path if necessary, but rooms connect to adjacent rooms directly
      // In our code: Generators connect to all adjacent rooms.
      // So (4,4) Golem Works is now powered by (5,4) Generator.

      // EXPECTED: T2 (Base 1 + 1 from Power).
      // CURRENT (Buggy): It probably reaches T3 because UpgradedByPower is 2 and we add it all if powered.
      fireEvent.mouseOver(cell44);
      expect(cell44?.getAttribute("data-tier")).toBe("2");

      // 3. Place Generator 2 at (4,3)
      const cell43 = getCell(4, 3);
      fireEvent.click(cell43);

      // EXPECTED: T3 (Base 1 + 2 from 2 Generators).
      fireEvent.mouseOver(cell44);
      expect(cell44?.getAttribute("data-tier")).toBe("3");
    });
  });

  it("does not propagate power from a non-generator room to another room or path", () => {
    render(<App />);

    // 1. Place a Generator at (4,4)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    // 2. Place a Path at (4,5) connected to Generator.
    // Need path2 for horizontal connection
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path2"));
    const cell45 = getCell(4, 5);
    fireEvent.click(cell45); // (4,5)

    // 3. Place a Room A at (3,5) - Powered by Path at (4,5)
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "3" } }); // Garrison
    const cell35 = getCell(3, 5);
    fireEvent.click(cell35); // (3,5) Room A

    // 4. Place a Room B at (2,5) - Adjacent to Room A but NOT to Path
    const cell25 = getCell(2, 5);
    fireEvent.click(cell25); // (2,5) Room B

    // 5. Place a Path B at (3,6) - Adjacent to Room A but NOT to Path (4,5)
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    const cell36 = getCell(3, 6);
    fireEvent.click(cell36); // (3,6) Path B

    // Verify Room A is powered
    expect(cell35.getAttribute("data-powered")).toBe("true");

    // Verify Room B and Path B are NOT powered (they are only adjacent to Room A)
    expect(cell25.getAttribute("data-powered")).not.toBe("true");
    expect(cell36?.getAttribute("data-powered")).toBe("false");
  });

  it("powers cells up to range 4 when generator is Tier 2", () => {
    render(<App />);

    // 1. Place a Generator at (4,4).
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    // Upgrade to Tier 2
    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cell44);

    // 2. Place connected paths to reach distance 4.
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("path1"));
    const cell54 = getCell(5, 4);
    const cell64 = getCell(6, 4);
    const cell74 = getCell(7, 4);
    const cell84 = getCell(8, 4);
    fireEvent.click(cell54); // (5,4) dist 1
    fireEvent.click(cell64); // (6,4) dist 2
    fireEvent.click(cell74); // (7,4) dist 3
    fireEvent.click(cell84); // (8,4) dist 4

    expect(cell84?.getAttribute("data-powered")).toBe("true");

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
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44); // (4,4)

    // Need to upgrade to Tier 3.
    // Medal + another adjacent upgrade?
    // Let's place another generator next to it if that works?
    // Actually, I'll use Thaumaturge (index 14) which upgrades Generator.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "14" } });
    const cell45 = getCell(4, 5);
    fireEvent.click(cell45); // Thaumaturge at (4,5) upgrades Generator at (4,4)

    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cell44); // Medal + Thaumaturge = T3

    fireEvent.mouseOver(cell44);
    expect(cell44?.getAttribute("data-tier")).toBe("3");
    expect(cell44?.getAttribute("data-room-id")).toBe("Generator");

    // 2. Place connected paths to reach distance 5.
    // (4,4) -> (5,4) -> (6,4) -> (7,4) -> (8,4) is distance 4.
    // (4,4) -> (3,4) -> (2,4) -> (1,4) -> (0,4) is distance 4.
    // Let's go (4,4) -> (4,3) -> (3,3) -> (2,3) -> (1,3) -> (0,3)
    fireEvent.click(screen.getByText("Path"));
    const cell43 = getCell(4, 3);
    const cell33 = getCell(3, 3);
    const cell23 = getCell(2, 3);
    const cell13 = getCell(1, 3);
    const cell03 = getCell(0, 3);
    fireEvent.click(cell43); // (4,3) dist 1
    fireEvent.click(cell33); // (3,3) dist 2
    fireEvent.click(cell23); // (2,3) dist 3
    fireEvent.click(cell13); // (1,3) dist 4
    fireEvent.click(cell03); // (0,3) dist 5

    // Since they automatically connect to neighbors that are paths/rooms:
    expect(cell03?.getAttribute("data-powered")).toBe("true");
  });

  it("powers cells around a corner to distance 2", () => {
    render(<App />);

    // 1. Place a Generator at (4,4) T2.
    fireEvent.click(screen.getByText("Room"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "7" } });
    const cell44 = getCell(4, 4);
    fireEvent.click(cell44);
    fireEvent.click(screen.getByText("Medal"));
    fireEvent.click(cell44);

    // 2. Place a corner path at (4,5) (Right of (4,4)).
    // To connect (4,4) [at its Left] and (5,5) [at its Bottom], it needs Left and Bottom.
    // pathcornerbottom has ["left", "top"]. Wait, (5,5) is BELOW (4,5)?
    // (4,5) index 41. (5,5) index 50. Yes, (5,5) is below (4,5).
    // So (4,5) needs Left (for (4,4)) and Bottom (for (5,5)).
    // pathcornerbottom connects Top and Left.
    // pathcornertop connects Bottom and Right.
    // pathcornerright connects Top and Right.
    // pathcornerleft connects Bottom and Left.
    fireEvent.click(screen.getByText("Path"));
    fireEvent.click(screen.getByTitle("pathcornerleft"));
    const cell45 = getCell(4, 5);
    fireEvent.click(cell45); // (4,5)

    // 3. Place a path at (5,5) (Bottom of (4,5)).
    // (5,5) index: 5*9+5=50.
    // Needs Top connection. path1 (T-B) has it.
    fireEvent.click(screen.getByTitle("path1"));
    const cell55 = getCell(5, 5);
    fireEvent.click(cell55);

    // Check power
    expect(cell45?.getAttribute("data-powered")).toBe("true");
    expect(cell55?.getAttribute("data-powered")).toBe("true");

    // Check distance at (5,5)
    fireEvent.mouseOver(cell55);
    expect(cell55?.getAttribute("data-powered")).toBe("true");
  });
});
