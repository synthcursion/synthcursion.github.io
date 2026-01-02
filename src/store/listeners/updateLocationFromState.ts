import { startAppListening } from "src/store";
import { selectQueryParams } from "src/store/selectors/selectQueryParams.ts";

startAppListening({
  predicate: (_, state, prevState) => {
    console.log("updateLocationFromState", selectQueryParams(state));
    return selectQueryParams(state) !== selectQueryParams(prevState);
  },
  effect: (_action, listenerApi) => {
    const url = new URL(window.location.href);
    url.search = selectQueryParams(listenerApi.getState());
    window.history.pushState({}, "", url.toString());
  },
});
