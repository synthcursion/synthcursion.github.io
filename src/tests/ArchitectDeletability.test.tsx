import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "src/App.tsx";
import { renderWithProviders } from "src/utils/test-utils.tsx";

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

describe("Architect Deletability Influence", () => {
  it("placing Architect should not prevent deletion of other rooms that connect it", () => {
    // Enable debug to set up the scenario
    const queryString = "?debug=true";
    renderWithProviders(<App />, { queryString });

    // Place Garrison at 4,1 (above ENTRY 4,0)
    fireEvent.click(screen.getAllByTitle("Garrison")[0]);
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Place Architect at 4,2 (above Garrison)
    fireEvent.click(screen.getAllByTitle("Architect's Chamber")[0]);
    fireEvent.click(screen.getByTestId("cell-4-2"));

    // Toggle debug off
    const debugCheckbox = screen.getByLabelText(
      "ignore placement restrictions",
    );
    fireEvent.click(debugCheckbox);

    // Try to delete Garrison (4,1).
    // If Architect (4,2) is treated as a regular room that MUST be reachable,
    // deleting Garrison will be blocked because Architect would be stranded.
    fireEvent.click(screen.getByTitle("Eraser"));
    fireEvent.click(screen.getByTestId("cell-4-1"));

    // Expected behavior per issue: Architect should NOT affect deletability.
    // So Garrison SHOULD be deletable even if Architect is stranded.
    const cell41 = screen.getByTestId("cell-4-1");
    expect(cell41.getAttribute("data-cell-type")).toBe(null);
  });
});
