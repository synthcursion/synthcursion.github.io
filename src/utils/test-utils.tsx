import { render } from "@testing-library/react";
import { configureStore, type Store } from "@reduxjs/toolkit";
import { Provider } from "react-redux";

import gameReducer, { getInitialState } from "src/store/gameSlice.ts";
import { type RootState } from "src/store";
import App from "src/App.tsx";

export function renderApp(queryString = "") {
  const store = configureStore({
    reducer: { game: gameReducer },
    preloadedState: {
      game: getInitialState(queryString),
    },
  }) as Store<RootState>;
  return {
    store,
    screen: render(<App />, {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    }),
  };
}
