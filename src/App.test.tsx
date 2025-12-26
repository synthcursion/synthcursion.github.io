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

    // Place path at (4,5) - Right of (4,4). (r=4, c=5)
    // Grid is 9x9, index = r*9 + c. 4*9 + 5 = 41.
    fireEvent.click(cells[41]);

    // Now (4,4) has a neighbor to the right.
    // It was path1 (Top-Bottom).
    // Now it should have Top, Bottom AND Right -> paththreeway4 (all but right? No, connects all but right is paththreeway4 in comment, wait)
    // Actually, if it was path1, it had Top-Bottom. Adding Right makes it Top-Bottom-Right.
    // Top-Bottom-Right = !left = paththreeway1.
    const img44 = cells[40].querySelector("img");
    expect(img44?.getAttribute("src")).toContain("paththreeway1.png");
  });

  it("preserves connections even after the neighbor is removed (permanent logic)", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Path"));

    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[40]); // (4,4) - path1 (T-B)
    fireEvent.click(cells[41]); // (4,5) - Right neighbor

    // (4,4) is now paththreeway1 (T-B-R)
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );

    // Select Eraser
    fireEvent.click(screen.getByText("Eraser"));
    fireEvent.click(cells[41]); // Remove (4,5)

    // (4,4) should STILL be paththreeway1 because connections are permanent
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );
  });

  it("connects paths to newly placed rooms", () => {
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
    // Place room at (4,5) - Right of (4,4)
    fireEvent.click(cells[41]);

    // (4,4) should now connect to the Room at its Right
    expect(cells[40].querySelector("img")?.getAttribute("src")).toContain(
      "paththreeway1.png",
    );
  });
});
