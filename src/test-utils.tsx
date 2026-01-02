import React, { PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

import gameReducer, { getInitialState } from "./store/gameSlice";
import { RootState } from "./store";

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  queryString?: string;
  store?: ReturnType<typeof configureStore>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    queryString = "",
    // Automatically create a store instance if no store was passed in
    store = configureStore({
      reducer: { game: gameReducer },
      preloadedState: {
        game: getInitialState(queryString),
      },
    }),
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  function Wrapper({ children }: PropsWithChildren<{}>): JSX.Element {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
