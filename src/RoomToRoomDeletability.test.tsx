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

describe("Room to Room Deletability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = "";
  });

  it("should NOT allow deleting a room if it is the only connection to another room via room-to-room connection", () => {
    // Scenario:
    // Entry (4,0)
    // Path (4,1)
    // Room A (3,1) - Connected to Path (4,1)
    // Room B (3,2) - Room A and Room B are NOT "connected" via room-to-room logic by default
    // BUT if Room A is "Garrison" and Room B is "Armoury", and Room B is placed next to Room A,
    // they might have a room-to-room connection if one upgrades the other.

    // Actually, let's use a simpler case:
    // Entry (4,0)
    // Path (4,1)
    // Room A (3,1) - Connected to Path (4,1)
    // Room B (2,1) - Room B is connected to Room A.

    window.location.search = "?debug=true";
    render(<App />);

    // Place Path at 4,1
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Garrison at 3,1
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Place Commander at 2,1 (Commander IS upgraded by Garrison)
    fireEvent.click(screen.getAllByTitle("Commander")[0]);
    fireEvent.click(screen.getByTestId("cell-2-1"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Now: Entry (4,0) -> Path (4,1) -> Garrison (3,1) -> Commander (2,1)
    // Garrison (3,1) is connected to Path (4,1) via room-to-path connection (calculated internally)
    // Commander (2,1) is connected to Garrison (3,1) via room-to-room connection (upgradedBy)

    // If we try to delete Garrison (3,1), Commander (2,1) would be stranded.
    // So Garrison (3,1) should NOT be deletable.

    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Garrison should still be there if it's NOT deletable
    expect(screen.getByTestId("cell-3-1").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });

  it("should allow deleting a room if the other room is NOT connected via room-to-room connection and has another connection", () => {
    window.location.search = "?debug=true";
    render(<App />);

    // Place Path at 4,1 and 2,1
    fireEvent.click(screen.getByTitle("path2"));
    fireEvent.click(screen.getByTestId("cell-4-1"));
    fireEvent.click(screen.getByTestId("cell-2-1"));

    // Place Garrison at 3,1 (Connected to Path 4,1)
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Place Armoury at 2,2 (Connected to nothing yet)
    // Actually let's make them adjacent:
    // Garrison at 3,1
    // Armoury at 3,2
    // Path at 4,1 connects to 3,1
    // Path at 4,2 connects to 3,2

    fireEvent.click(screen.getByTestId("cell-4-1")); // Path at 4,1
    fireEvent.click(screen.getByTestId("cell-4-2")); // Path at 4,2

    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-3-1"));

    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-3-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Now:
    // Entry (4,0) -> Path (4,1) -> Garrison (3,1)
    // Entry (4,0) -> Path (4,1) -> Path (4,2) -> Armoury (3,2)
    // Garrison (3,1) and Armoury (3,2) are adjacent but NOT connected via R2R.

    // Deleting Garrison (3,1) should be allowed.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-3-1"));

    // Garrison should be gone
    expect(screen.getByTestId("cell-3-1").getAttribute("data-cell-type")).toBe(
      null,
    );
  });

  it("should NOT allow deleting Armoury at 4,1 if it's the sole connection for Garrison at 4,2 and Armoury at 4,3", () => {
    // Layout: rooms[]=Armoury-4-1&rooms[]=Garrison-4-2&rooms[]=Armoury-4-3
    // Entry is at 4,0.
    // Armoury (4,1) is next to Entry (4,0).
    // Garrison (4,2) is next to Armoury (4,1). (Armoury upgrades Garrison)
    // Armoury (4,3) is next to Garrison (4,2). (Armoury upgrades Garrison)
    // All are connected via Room-to-Room connections.
    // Deleting Armoury (4,1) would leave the other two stranded.

    window.location.search = "?debug=true";
    render(<App />);

    // Place Armoury at 4,1
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Garrison at 4,2
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Place Armoury at 4,3
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-3"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Armoury (4,1)
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Armoury (4,1) should still be there
    expect(screen.getByTestId("cell-4-1").getAttribute("data-cell-type")).toBe(
      "room",
    );
    expect(screen.getByTestId("cell-4-2").getAttribute("data-cell-type")).toBe(
      "room",
    );
    expect(screen.getByTestId("cell-4-3").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });
});
