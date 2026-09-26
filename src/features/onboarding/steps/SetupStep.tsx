import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { resolveDisplayName, validatePlayerName } from '@/features/leaderboard/playerName';
import { useProgression } from '@/features/progression';
import { useReminders } from '@/features/reminders';
import { useAuth } from '@/services/firebase/auth';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

export type SetupChoice = 'daily' | 'explore';

export interface SetupOutcome {
  choice: SetupChoice;
  /** Whether the player chose their own name rather than keeping the handle. */
  named: boolean;
  /** Whether Daily reminders ended up enabled. */
  reminders: boolean;
}

/**
 * Name and reminders, both optional, then straight into the game. The handle
 * is pre-filled so nobody has to type; the reminder switch asks the system
 * for permission only when it is turned on.
 */
export function SetupStep({ onFinish }: { onFinish: (outcome: SetupOutcome) => void }) {
  const colors = useThemeColors();
  const { uid } = useAuth();
  // Onboarding opens before the profile has loaded (a fresh install never
  // waits on sign-in), so the name write is held until it has: a write made
  // while loading is dropped by the provider to protect the incoming save.
  const { state, setDisplayName, isLoading: profileLoading } = useProgression();
  const reminders = useReminders();

  const handle = resolveDisplayName(null, uid);
  const [name, setName] = useState(state.displayName ?? handle);
  const [nameError, setNameError] = useState<string | null>(null);
  const [remindersOn, setRemindersOn] = useState(reminders.enabled);
  const [busy, setBusy] = useState(false);

  const toggleReminders = async (next: boolean) => {
    if (!next) {
      reminders.disable();
      setRemindersOn(false);
      return;
    }
    setBusy(true);
    const granted = await reminders.enable();
    setRemindersOn(granted);
    setBusy(false);
  };

  const finish = (choice: SetupChoice) => {
    const trimmed = name.trim();
    let named = false;
    if (trimmed.length > 0 && trimmed !== handle) {
      const check = validatePlayerName(trimmed);
      if (!check.ok) {
        setNameError(check.reason);
        return;
      }
      setDisplayName(check.name);
      named = true;
    } else {
      setDisplayName(null);
    }
    onFinish({ choice, named, reminders: remindersOn });
  };

  return (
    <View className="flex-1 justify-between">
      <View className="flex-1 justify-center gap-6">
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Text className="text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Last thing
          </Text>
          <Text className="text-center text-3xl font-extrabold text-ink-primary">Make it yours</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(150).springify().damping(16)}
          className="gap-2 border border-hair bg-bg-raised p-4"
        >
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Your name on the leaderboard
          </Text>
          <TextInput
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError(null);
            }}
            maxLength={24}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder={handle}
            placeholderTextColor={colors.ink.muted}
            className="border border-hair bg-bg-base px-3 py-2.5 text-lg font-bold text-ink-primary"
            accessibilityLabel="Your player name"
            testID="onboarding-name"
          />
          {nameError ? (
            <Text className="text-xs font-semibold" style={{ color: palette.danger }}>
              {nameError}
            </Text>
          ) : (
            <Text className="text-xs text-ink-muted">
              Keep {handle}, or pick something of your own. You can change it any time.
            </Text>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(280).springify().damping(16)}
          className="flex-row items-center justify-between gap-3 border border-hair bg-bg-raised p-4"
        >
          <View className="flex-1">
            <Text className="text-base font-bold text-ink-primary">Daily reminder</Text>
            <Text className="text-xs text-ink-muted">
              One nudge a day so your streak survives. Off by default.
            </Text>
          </View>
          <Switch
            value={remindersOn}
            disabled={busy}
            onValueChange={(v) => void toggleReminders(v)}
            trackColor={{ true: palette.accent.soft, false: colors.hair }}
            thumbColor={remindersOn ? palette.accent.default : colors.bg.raised}
            accessibilityLabel="Daily reminder"
            testID="onboarding-reminders"
          />
        </Animated.View>
      </View>

      <View className="gap-2">
        <Button
          label="Play today’s Daily"
          glyph="→"
          variant="hero"
          disabled={profileLoading}
          onPress={() => finish('daily')}
          testID="onboarding-play-daily"
        />
        <Pressable
          onPress={() => finish('explore')}
          disabled={profileLoading}
          accessibilityRole="button"
          className="items-center py-3"
          testID="onboarding-explore"
        >
          <Text className="text-sm font-semibold text-ink-muted">Explore first</Text>
        </Pressable>
      </View>
    </View>
  );
}
