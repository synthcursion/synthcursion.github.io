import { startAppListening } from "src/store/index.ts";
import { selectQueryParams } from "src/store/selectors/selectQueryParams.ts";

startAppListening({
  predicate: (_, state, prevState) =>
    selectQueryParams(state) !== selectQueryParams(prevState),
  effect: (_action, listenerApi) => {
    const url = new URL(window.location.href);
    url.search = selectQueryParams(listenerApi.getState());
    if (window?.history?.pushState) {
      window.history.pushState({}, "", url.toString());
    }
  },
});
