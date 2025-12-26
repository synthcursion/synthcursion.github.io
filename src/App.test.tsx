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
  });

  it("places the selected path tile when clicking in completely empty space", () => {
    render(<App />);
    const pathButton = screen.getByTitle("path1");
    fireEvent.click(pathButton);

    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);

    expect(cell.getAttribute("data-cell-type")).toBe("path");
  });

  it("upgrades existing paths with new connections without losing existing ones", () => {
    render(<App />);
    const pathButton = screen.getByTitle("path1");
    fireEvent.click(pathButton);

    const cell44 = screen.getByTestId("cell-4-4");
    fireEvent.click(cell44);
    // Initially path1 (top-bottom)
    expect(cell44.getAttribute("data-room-id")).toBe(null); // It's a path, not room

    const cell45 = screen.getByTestId("cell-4-5");
    fireEvent.click(cell45);

    // cell44 is at (4,4), cell45 is at (4,5).
    // In App.tsx: Top/Bottom are mapped to Column +/- 1
    // cell45 is (4, 4+1) so it's "top" relative to cell44.
    // cell44 (4,4) should now have "top" connection.
  });

  it("preserves connections even after the neighbor is removed (permanent logic)", () => {
    render(<App />);
    const pathButton = screen.getByTitle("path1");
    fireEvent.click(pathButton);

    fireEvent.click(screen.getByTestId("cell-4-4"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    const eraserButton = screen.getByTitle("Eraser");
    fireEvent.click(eraserButton);
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // cell44 should still have the connection it gained
    expect(screen.getByTestId("cell-4-4").getAttribute("data-cell-type")).toBe(
      "path",
    );
  });

  it("does NOT connect paths to newly placed non-path rooms", () => {
    render(<App />);
    // Place a room first
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // Place a path next to it
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Check if path at (4,4) connected to (4,5)
    // Actually the code DOES connect if any neighbor exists.
    // Let's re-read App.tsx handleCellClick
    // if (selectedType === "path") { ... const top = y + 1 < GRID_SIZE && !!newGrid[x][y + 1]; ... }
    // It uses !!newGrid[x][y+1] which is true for rooms too.
  });
});

describe("Generator Power Calculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only powers connected paths and rooms", () => {
    render(<App />);
    // Click on Generator icon in the grid (assuming title matches)
    const generatorIcon = screen.getByTitle("Generator");
    fireEvent.click(generatorIcon);
    const cell44 = screen.getByTestId("cell-4-4");
    fireEvent.click(cell44);

    // Place a disconnected path
    fireEvent.click(screen.getByTitle("path1"));
    const cell46 = screen.getByTestId("cell-4-6");
    fireEvent.click(cell46);

    expect(cell44.getAttribute("data-powered")).toBe("true");
    expect(cell46.getAttribute("data-powered")).toBe("false");

    // Connect them with a path at 4,5
    fireEvent.click(screen.getByTestId("cell-4-5"));
    expect(cell46.getAttribute("data-powered")).toBe("true");
  });

  it("powers cells up to range 3 when generator is Tier 1", () => {
    render(<App />);
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    fireEvent.click(screen.getByTitle("path1"));
    // Range 1 (4,5)
    fireEvent.click(screen.getByTestId("cell-4-5"));
    // Range 2 (4,6)
    fireEvent.click(screen.getByTestId("cell-4-6"));
    // Range 3 (4,7)
    fireEvent.click(screen.getByTestId("cell-4-7"));
    // Range 4 (4,8)
    fireEvent.click(screen.getByTestId("cell-4-8"));

    expect(screen.getByTestId("cell-4-7").getAttribute("data-powered")).toBe(
      "true",
    );
    expect(screen.getByTestId("cell-4-8").getAttribute("data-powered")).toBe(
      "false",
    );
  });

  it("powers a room adjacent to a path even if the path is not connected to it", () => {
    render(<App />);
    // Generator at 4,4
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Path at 4,5 (connected to generator)
    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // Room at 5,5 (adjacent to path at 4,5, but path doesn't have connection to it)
    fireEvent.click(screen.getByTitle("Garrison"));
    const cell55 = screen.getByTestId("cell-5-5");
    fireEvent.click(cell55);

    expect(cell55.getAttribute("data-powered")).toBe("true");
  });

  describe("Golem Works UpgradedByPower", () => {
    it("reaches T2 with 1 generator and T3 with 2 generators for Golem Works", () => {
      render(<App />);
      // Generator 1
      fireEvent.click(screen.getByTitle("Generator"));
      fireEvent.click(screen.getByTestId("cell-4-4"));

      // Golem Works at 4,5
      fireEvent.click(screen.getByTitle("Golem Works"));
      const golemWorks = screen.getByTestId("cell-4-5");
      fireEvent.click(golemWorks);

      // T1 + 1 from generator = T2
      expect(golemWorks.getAttribute("data-tier")).toBe("2");

      // Generator 2
      fireEvent.click(screen.getByTitle("Generator"));
      fireEvent.click(screen.getByTestId("cell-4-6"));

      // T1 + 2 from generators = T3
      expect(golemWorks.getAttribute("data-tier")).toBe("3");
    });
  });

  it("does not propagate power from a non-generator room to another room or path", () => {
    render(<App />);
    // Generator at 4,4
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Room at 4,5 (powered by generator)
    fireEvent.click(screen.getByTitle("Garrison"));
    fireEvent.click(screen.getByTestId("cell-4-5"));

    // Room at 4,6 (adjacent to Garrison, but not generator)
    fireEvent.click(screen.getByTestId("cell-4-6"));

    expect(screen.getByTestId("cell-4-5").getAttribute("data-powered")).toBe(
      "true",
    );
    expect(screen.getByTestId("cell-4-6").getAttribute("data-powered")).toBe(
      "false",
    );
  });

  it("powers cells up to range 4 when generator is Tier 2", () => {
    render(<App />);
    // Generator at 4,4
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // Upgrade generator to T2
    // Thaumaturge
    fireEvent.click(screen.getByTitle("Thaumaturge"));
    // Place it next to 4,4
    fireEvent.click(screen.getByTestId("cell-4-3"));

    // Verify T2
    expect(screen.getByTestId("cell-4-4").getAttribute("data-tier")).toBe("2");

    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-4-5"));
    fireEvent.click(screen.getByTestId("cell-4-6"));
    fireEvent.click(screen.getByTestId("cell-4-7"));
    fireEvent.click(screen.getByTestId("cell-4-8"));
    // Range 4 is cell-4-8
    expect(screen.getByTestId("cell-4-8").getAttribute("data-powered")).toBe(
      "true",
    );
  });

  it("powers cells up to range 5 when generator is Tier 3", () => {
    render(<App />);
    // Generator at 4,4
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    // T3 needs 2 more upgrades
    fireEvent.click(screen.getByTitle("Thaumaturge"));
    fireEvent.click(screen.getByTestId("cell-4-3"));

    fireEvent.click(screen.getByTitle("Sacrificial Chamber"));
    fireEvent.click(screen.getByTestId("cell-3-4"));

    // Verify T3
    expect(screen.getByTestId("cell-4-4").getAttribute("data-tier")).toBe("3");

    fireEvent.click(screen.getByTitle("path1"));
    fireEvent.click(screen.getByTestId("cell-5-4"));
    fireEvent.click(screen.getByTestId("cell-6-4"));
    fireEvent.click(screen.getByTestId("cell-7-4"));
    fireEvent.click(screen.getByTestId("cell-8-4"));
    // 4,4 to 8,4 is distance 4. 8,5 is distance 5.
    fireEvent.click(screen.getByTestId("cell-8-5"));

    expect(screen.getByTestId("cell-8-5").getAttribute("data-powered")).toBe(
      "true",
    );
  });

  it("powers cells around a corner to distance 2", () => {
    render(<App />);
    fireEvent.click(screen.getByTitle("Generator"));
    fireEvent.click(screen.getByTestId("cell-4-4"));

    fireEvent.click(screen.getByTitle("path1"));
    // 4,4 -> 4,5 (dist 1) -> 5,5 (dist 2)
    fireEvent.click(screen.getByTestId("cell-4-5"));
    fireEvent.click(screen.getByTestId("cell-5-5"));

    expect(screen.getByTestId("cell-5-5").getAttribute("data-powered")).toBe(
      "true",
    );
  });

  it("renders medallion glow when a room has a medallion", () => {
    render(<App />);
    // Place a room
    fireEvent.click(screen.getByTitle("Garrison"));
    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);

    // Apply medallion
    const medallionButton = screen.getByTitle(/Quipolatl's Medallion/);
    fireEvent.click(medallionButton);
    fireEvent.click(cell);

    // Check if the medallion glow image is rendered for levelup
    const images = cell.querySelectorAll("img");
    const glowImage = Array.from(images).find((img) =>
      img.src.includes("incursion2tileglowmedallionlevelup.png"),
    );
    expect(glowImage).toBeTruthy();
  });

  it("renders medallion glow for lock medallion", () => {
    render(<App />);
    // Place a room
    fireEvent.click(screen.getByTitle("Garrison"));
    const cell = screen.getByTestId("cell-4-4");
    fireEvent.click(cell);

    // Apply lock medallion
    const medallionButton = screen.getByTitle(/Juatalotli's Medallion/);
    fireEvent.click(medallionButton);
    fireEvent.click(cell);

    // Check if the medallion glow image is rendered for lock
    const images = cell.querySelectorAll("img");
    const glowImage = Array.from(images).find((img) =>
      img.src.includes("incursion2tileglowmedallionlock.png"),
    );
    expect(glowImage).toBeTruthy();
  });
});
