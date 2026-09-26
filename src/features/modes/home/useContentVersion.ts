import { useSyncExternalStore } from 'react';

import { getContentVersion, subscribeContent } from '@/data';

/**
 * Re-renders the caller whenever the live catalogue changes (a remote refresh
 * landing after first paint). Returns the version so it can key derived data.
 */
export function useContentVersion(): number {
  return useSyncExternalStore(subscribeContent, getContentVersion, getContentVersion);
}
