import { render } from "@testing-library/react";
import App from "./App.tsx";
import { expect, test, vi } from "vitest";

test("loads state from URL correctly", () => {
  window.location.search =
    "debug=false&paths[]=pathfourway-4-0&rooms[]=Commander-5-0&rooms[]=Garrison-6-0&rooms[]=Armoury-6-1&rooms[]=Commander-7-0&rooms[]=Garrison-7-1&rooms[]=Garrison-8-0&rooms[]=Armoury-8-1";

  // Mock window.history.replaceState
  window.history.replaceState = vi.fn();

  const { getByTestId } = render(<App />);

  // Cells have test-id="cell-{x}-{y}" in App.tsx
  // Let's verify some of them are populated.
  // Commander-5-0
  const cell50 = getByTestId("cell-5-0");
  expect(cell50.getAttribute("data-room-id")).toBe("Commander");

  // Garrison-6-0
  const cell60 = getByTestId("cell-6-0");
  expect(cell60.getAttribute("data-room-id")).toBe("Garrison");

  // Armoury-6-1
  const cell61 = getByTestId("cell-6-1");
  expect(cell61.getAttribute("data-room-id")).toBe("Armoury");

  // pathfourway-4-0
  const cell40 = getByTestId("cell-4-0");
  expect(cell40.getAttribute("data-cell-type")).toBe("path");
});
