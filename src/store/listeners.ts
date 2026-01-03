import { startAppListening, store } from "src/store/index.ts";
import { selectQueryParams } from "src/store/selectors/selectQueryParams.ts";
import { loadStateFromQuery } from "src/store/gameSlice.ts";

window.addEventListener("popstate", () => {
  store.dispatch(loadStateFromQuery(window.location.search));
});

startAppListening({
  predicate: (_, state, prevState) =>
    selectQueryParams(state, true) !== selectQueryParams(prevState, true),
  effect: (_action, listenerApi) => {
    const url = new URL(window.location.href);
    const newQuery = selectQueryParams(listenerApi.getState(), true);

    // If the URL already matches the state, don't do anything.
    // This prevents loops when the state change was triggered by popstate.
    if (url.search === (newQuery ? `?${newQuery}` : "")) {
      return;
    }

    const action =
      selectQueryParams(listenerApi.getState(), false) ===
      selectQueryParams(listenerApi.getOriginalState(), false)
        ? window.history?.replaceState
        : window.history?.pushState;

    url.search = newQuery;
    if (action) {
      action.bind(window.history)({}, "", url.toString());
    }
  },
});
