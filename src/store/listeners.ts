import { startAppListening } from "src/store/index.ts";
import { selectQueryParams } from "src/store/selectors/selectQueryParams.ts";

startAppListening({
  predicate: (_, state, prevState) =>
    selectQueryParams(state, true) !== selectQueryParams(prevState, true),
  effect: (_action, listenerApi) => {
    const action =
      selectQueryParams(listenerApi.getState(), false) ===
      selectQueryParams(listenerApi.getOriginalState(), false)
        ? window.history?.replaceState
        : window.history?.pushState;

    const url = new URL(window.location.href);
    url.search = selectQueryParams(listenerApi.getState(), true);
    if (action) {
      action.bind(window.history)({}, "", url.toString());
    }
  },
});
