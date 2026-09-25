import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui';

import { REMINDER_HOUR } from './reminderTime';
import { useReminders } from './RemindersProvider';

/**
 * Once-only card on the Daily summary: the moment a player has just finished
 * one is the moment a reminder for tomorrow's makes sense. Either answer is
 * remembered; the switch lives in Profile → Settings after that.
 */
export function ReminderNudge() {
  const { asked, isLoading, enable, dismissNudge } = useReminders();
  if (isLoading || asked) return null;

  return (
    <View className="gap-3 border border-hair bg-bg-overlay p-4" testID="reminder-nudge">
      <View>
        <Text className="text-base font-semibold text-ink-primary">Remind me tomorrow?</Text>
        <Text className="mt-0.5 text-xs text-ink-muted">
          One nudge a day at {REMINDER_HOUR}:00 when a fresh Daily is waiting. Never on a day you
          have already played.
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <Button
            label="Remind me"
            onPress={() => void enable()}
            testID="reminder-nudge-accept"
          />
        </View>
        <Pressable
          onPress={dismissNudge}
          accessibilityRole="button"
          hitSlop={8}
          testID="reminder-nudge-dismiss"
          className="px-3 py-2"
        >
          <Text className="text-sm font-semibold text-ink-muted">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}
