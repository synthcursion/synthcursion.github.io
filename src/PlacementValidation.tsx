import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

// Mock URL and window.history since the App uses it for persistence
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: {
    replaceState: mockReplaceState,
  },
});

describe("Valid Placement Highlighting", () => {
  it("should not highlight room that could have been validly placed, even if it would not be re-placeable", () => {
    // rooms[]=Garrison-3-0&rooms[]=Armoury-3-1&rooms[]=Garrison-4-1&rooms[]=Armoury-4-2
    const params =
      "?rooms[]=Garrison-3-0&rooms[]=Armoury-3-1&rooms[]=Garrison-4-1&rooms[]=Armoury-4-2";

    // Mocking window.location.search
    Object.defineProperty(window, "location", {
      value: {
        search: params,
        href: `http://localhost/${params}`,
      },
      writable: true,
    });

    render(<App />);

    const armoury31 = screen.getByTestId("cell-3-1");
    const armoury42 = screen.getByTestId("cell-4-2");

    expect(armoury31.getAttribute("data-room-id")).toBe("Armoury");
    expect(armoury42.getAttribute("data-room-id")).toBe("Armoury");

    const glow31 = armoury31.querySelector(".invalid-glow");
    const glow42 = armoury42.querySelector(".invalid-glow");

    expect(glow31, "Armoury at 3,1 should not be invalid").toBeNull();
    expect(glow42, "Armoury at 4,2 should not be invalid").toBeNull();
  });
});
