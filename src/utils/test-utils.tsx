import React from "react";
import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import { configureStore, type Store } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

import gameReducer, { getInitialState } from "src/store/gameSlice.ts";
import type { RootState } from "src/store";

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
    }) as Store<RootState>,
    ...renderOptions
  }: ExtendedRenderOptions = {},
) {
  return {
    store,
    screen: render(ui, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
      ...renderOptions,
    }),
  };
}
