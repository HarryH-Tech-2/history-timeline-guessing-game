import { Modal, Pressable, Text, View } from 'react-native';

import { deviceLanguage, LANGUAGES, t, useLanguage, type LanguagePreference } from '@/i18n';

interface LanguageSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet for the app language: follow the phone (the default) or pick
 * one. Each language is listed in its own name so it's findable from any.
 */
export function LanguageSheet({ visible, onClose }: LanguageSheetProps) {
  const { preference, setPreference } = useLanguage();
  const phone = LANGUAGES.find((l) => l.code === deviceLanguage())?.name ?? 'English';
  const options: { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t('profile.settings.languageDevice', { language: phone }) },
    ...LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
  ];

  const choose = (value: LanguagePreference) => {
    onClose();
    // The app remounts in the new language, so let the sheet close first.
    if (value !== preference) setTimeout(() => setPreference(value), 250);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={onClose}
        accessibilityLabel={t('common.close')}
        testID="language-backdrop"
      >
        <Pressable className="gap-2 border-t border-hair bg-bg-overlay p-6 pb-10" onPress={() => {}}>
          <Text className="mb-2 text-xl font-extrabold text-ink-primary">
            {t('profile.settings.languageSheetTitle')}
          </Text>
          {options.map((option) => {
            const selected = option.value === preference;
            return (
              <Pressable
                key={option.value}
                onPress={() => choose(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                testID={`language-option-${option.value}`}
                className={`flex-row items-center justify-between border bg-bg-raised p-4 ${
                  selected ? 'border-accent' : 'border-hair'
                }`}
              >
                <Text className="text-base font-semibold text-ink-primary">{option.label}</Text>
                {selected && <Text className="text-base text-accent">✓</Text>}
              </Pressable>
            );
          })}
          <View className="h-1" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
