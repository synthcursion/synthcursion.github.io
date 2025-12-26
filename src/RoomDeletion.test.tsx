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

describe("Room Deletion Restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.search = "";
  });

  it("cannot delete a room if it leaves another non-boss room stranded", () => {
    // Enable debug to set up the scenario easily
    window.location.search = "?debug=true";
    render(<App />);

    // Place Garrison at 4,1 (above ENTRY 4,0)
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Armoury at 4,2 (above Garrison)
    fireEvent.click(screen.getAllByTitle("Armoury")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Garrison (4,1). Armoury (4,2) will be stranded.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Garrison should still be there
    expect(screen.getByTestId("cell-4-1").getAttribute("data-cell-type")).toBe(
      "room",
    );
    expect(screen.getByTestId("cell-4-2").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });

  it("CAN delete a room if it only leaves a boss/reward room stranded", () => {
    // Enable debug to set up the scenario easily
    window.location.search = "?debug=true";
    render(<App />);

    // Place Garrison at 4,1
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Currency Vault (Reward) at 4,2
    fireEvent.click(screen.getAllByTitle("Currency Vault")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Garrison (4,1). Reward room (4,2) will be stranded, which is allowed.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Garrison should be gone (null or empty)
    const cell41 = screen.getByTestId("cell-4-1");
    expect(cell41.getAttribute("data-cell-type")).toBe(null);
    expect(screen.getByTestId("cell-4-2").getAttribute("data-cell-type")).toBe(
      "room",
    );
  });
});
