import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * Bottom padding for a sheet pinned to the bottom of a Modal: the sheet's own
 * padding plus the system navigation bar's inset. A Modal draws edge to edge,
 * so without the inset a three-button nav bar sits on top of the last button.
 * Reads the context directly so a sheet rendered without a provider (tests)
 * just gets its base padding.
 */
export function useSheetBottomPadding(base: number): number {
  const insets = useContext(SafeAreaInsetsContext);
  return base + (insets?.bottom ?? 0);
}
