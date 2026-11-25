import { useSyncExternalStore } from "react";
import { useSearchParams } from "react-router";
import { getPrefs, subscribePrefs } from "./prefs";

/** True when answers should be hidden: streamer mode is on, or the URL says `?spoilers=off`. */
export function useSpoilersHidden(): boolean {
  const [params] = useSearchParams();
  const streamer = useSyncExternalStore(
    subscribePrefs,
    () => getPrefs().streamer,
    () => false,
  );
  return streamer || params.get("spoilers") === "off";
}
