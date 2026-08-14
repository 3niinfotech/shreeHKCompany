import { useEffect } from "react";
import useAuthStore from "../store/Auth.Store";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];

/** Surfaces that report the timestamp must not refresh it themselves. */
const IGNORE_SELECTOR = "[data-activity-ignore='true']";

let trackerOwners = 0;
let detachListeners = null;

const attachListeners = () => {
  const onActivity = (event) => {
    const target = event.target;
    if (target?.closest?.(IGNORE_SELECTOR)) return;
    useAuthStore.getState().markActivity();
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      useAuthStore.getState().markActivity();
    }
  };

  ACTIVITY_EVENTS.forEach((event) => {
    window.addEventListener(event, onActivity, { passive: true });
  });
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, onActivity);
    });
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};

/**
 * Records the last real user interaction on the auth store.
 * Module-level owner count keeps a single listener set across StrictMode remounts.
 */
const useActivityTracker = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    trackerOwners += 1;
    if (!detachListeners) {
      detachListeners = attachListeners();
      useAuthStore.getState().markActivity();
    }

    return () => {
      trackerOwners -= 1;
      if (trackerOwners <= 0 && detachListeners) {
        detachListeners();
        detachListeners = null;
      }
    };
  }, [isAuthenticated]);
};

export default useActivityTracker;
