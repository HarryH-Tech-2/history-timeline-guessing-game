import { AppState, type AppStateStatus } from 'react-native';

import { track } from './client';
import type { AppTab } from './events';

/** When the app was last opened (launched, or brought back to the foreground). */
let openedAt = Date.now();
/** Whether a tab has been tapped since then. */
let tappedSinceOpen = false;
let lastState: AppStateStatus = AppState.currentState;

AppState.addEventListener('change', (next) => {
  if (next === 'active' && lastState !== 'active') {
    openedAt = Date.now();
    tappedSinceOpen = false;
  }
  lastState = next;
});

/**
 * Report a bottom-bar tab tap, stamped with whether it's the first tab tapped
 * since the app was opened and how many seconds after opening it came.
 */
export function trackTabSelected(tab: AppTab, now: number = Date.now()): void {
  const first = !tappedSinceOpen;
  tappedSinceOpen = true;
  track('tab_selected', {
    tab,
    first_this_open: first,
    seconds_since_open: Math.max(0, Math.round((now - openedAt) / 1000)),
  });
}

/** Test hook: start a fresh app open at `at`. */
export function resetTabTrackingForTests(at: number = Date.now()): void {
  openedAt = at;
  tappedSinceOpen = false;
}
