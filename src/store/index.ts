import {
  configureStore,
  createListenerMiddleware,
  createSelector,
  type TypedStartListening,
} from "@reduxjs/toolkit";
import gameReducer from "./gameSlice";

export const listenerMiddleware = createListenerMiddleware();

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Create a pre-typed startListening function
export type AppStartListening = TypedStartListening<RootState, AppDispatch>;
export const startAppListening =
  listenerMiddleware.startListening as AppStartListening;
export const createAppSelector = createSelector.withTypes<RootState>();

import("./listeners.ts");
