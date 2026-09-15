import * as Haptics from 'expo-haptics';

/**
 * The single gate every vibration in the app goes through. A module-level
 * flag (rather than context) so worklet-adjacent code and plain components
 * can buzz without a provider in scope; HapticsProvider keeps it in step with
 * the persisted Vibration setting.
 */
let enabled = true;

export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Fire-and-forget wrappers: silent no-ops while vibration is off. */
export const haptic = {
  /** A light tap for button presses. */
  impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): void {
    if (!enabled) return;
    void Haptics.impactAsync(style).catch(() => {});
  },
  /** The tick as the timeline scrubs past a decade or a year-step lands. */
  selection(): void {
    if (!enabled) return;
    void Haptics.selectionAsync().catch(() => {});
  },
  /** The right/wrong buzz when an answer lands. */
  notification(type: Haptics.NotificationFeedbackType): void {
    if (!enabled) return;
    void Haptics.notificationAsync(type).catch(() => {});
  },
};

export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
