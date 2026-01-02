import { vi } from "vitest";

vi.mock("react-tooltip", () => ({
  Tooltip: () => null,
}));
