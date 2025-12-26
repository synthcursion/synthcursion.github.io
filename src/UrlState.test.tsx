import { render } from "@testing-library/react";
import App from "./App.tsx";
import { expect, test, vi } from "vitest";

test("loads state from URL correctly", () => {
  const params =
    "?debug=false&paths[]=pathfourway-4-0&rooms[]=Commander-5-0&rooms[]=Garrison-6-0&rooms[]=Armoury-6-1&rooms[]=Commander-7-0&rooms[]=Garrison-7-1&rooms[]=Garrison-8-0&rooms[]=Armoury-8-1";

  window.history.pushState({}, "", params);

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

test("does not add debug=false to the URL", async () => {
  // Clear URL
  window.history.pushState({}, "", "/");

  // Mock window.history.replaceState
  const replaceStateSpy = vi.fn();
  window.history.replaceState = replaceStateSpy;

  const { findByTestId } = render(<App />);

  // Wait for the cell to be rendered which indicates the app has initialized and useEffect has likely run
  await findByTestId("cell-0-0");

  const lastCall =
    replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1];
  const url = new URL(lastCall[2], window.location.origin);

  expect(url.searchParams.has("debug")).toBe(false);
});

test("adds debug=true to the URL when enabled", async () => {
  // Start with debug=true
  window.history.pushState({}, "", "/?debug=true");

  // Mock window.history.replaceState
  const replaceStateSpy = vi.fn();
  window.history.replaceState = replaceStateSpy;

  const { findByTestId } = render(<App />);

  await findByTestId("cell-0-0");

  const lastCall =
    replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1];
  const url = new URL(lastCall[2], window.location.origin);

  expect(url.searchParams.get("debug")).toBe("true");
});
