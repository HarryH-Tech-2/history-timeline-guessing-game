import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
// Direct module import (not the barrel) so this sheet doesn't drag the whole
// leaderboard screen — and its navigation dependencies — into every consumer.
import { MAX_DISPLAY_NAME, validatePlayerName } from '@/features/leaderboard/playerName';
import { useThemeColors } from '@/theme';
import { palette } from '@/theme/tokens';

interface PlayerNameSheetProps {
  visible: boolean;
  /** The current chosen name, or null when the generated handle is in use. */
  currentName: string | null;
  /** The name shown while no custom one is set (the generated handle). */
  fallbackName: string;
  onSave: (name: string | null) => void;
  onClose: () => void;
}

type FormProps = Omit<PlayerNameSheetProps, 'visible'>;

/** The editable body. Mounted fresh on every open, so its draft always starts from the saved name. */
function NameForm({ currentName, fallbackName, onSave, onClose }: FormProps) {
  const colors = useThemeColors();
  const [draft, setDraft] = useState(currentName ?? '');

  const trimmed = draft.trim();
  const validation = trimmed.length === 0 ? null : validatePlayerName(draft);
  const error = validation !== null && !validation.ok ? validation.reason : null;
  const unchanged = (validation?.ok ? validation.name : null) === currentName;

  const save = () => {
    if (trimmed.length === 0) {
      onSave(null);
    } else if (validation?.ok) {
      onSave(validation.name);
    } else {
      return;
    }
    onClose();
  };

  return (
    <Pressable className="gap-4 border-t border-hair bg-bg-overlay p-6 pb-10" onPress={() => {}}>
      <View>
        <Text className="text-xl font-extrabold text-ink-primary">Your name</Text>
        <Text className="mt-1 text-sm text-ink-secondary">
          Shown on the leaderboard and your profile. Leave it blank to go by{' '}
          <Text className="font-semibold text-ink-primary">{fallbackName}</Text>.
        </Text>
      </View>

      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={fallbackName}
        placeholderTextColor={colors.ink.muted}
        maxLength={MAX_DISPLAY_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={save}
        accessibilityLabel="Player name"
        testID="player-name-input"
        className="border border-hair bg-bg-raised px-4 py-3 text-base text-ink-primary"
        style={{ color: colors.ink.primary }}
      />

      <View className="min-h-5 flex-row items-center justify-between">
        <Text
          className="flex-1 text-xs"
          style={{ color: error ? palette.danger : colors.ink.muted }}
          testID="player-name-hint"
        >
          {error ?? '3–24 characters · letters, numbers, spaces, - _ ’'}
        </Text>
        <Text className="text-xs text-ink-muted">
          {draft.length}/{MAX_DISPLAY_NAME}
        </Text>
      </View>

      <Button
        label={trimmed.length === 0 && currentName !== null ? 'Use generated name' : 'Save'}
        onPress={save}
        disabled={error !== null || unchanged}
        testID="player-name-save"
      />
      <Button label="Cancel" variant="ghost" onPress={onClose} className="h-11" />
    </Pressable>
  );
}

/**
 * Bottom sheet for choosing the public name shown on the leaderboard and
 * profile. Validates as the player types, and lets them clear back to the
 * generated handle.
 */
export function PlayerNameSheet({ visible, ...form }: PlayerNameSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={form.onClose}>
      {/* A Modal is its own window on Android, so the app's adjustResize
          doesn't apply and the keyboard would sit over the field. Pad the
          sheet up by the keyboard height instead. */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={form.onClose}
          accessibilityLabel="Close"
          testID="player-name-backdrop"
        >
          {visible && <NameForm {...form} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
