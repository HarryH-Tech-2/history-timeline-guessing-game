import { Pressable, Text } from 'react-native';

import { haptic } from '@/features/haptics';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { t } from '@/i18n';
import { track } from '@/services/analytics';
import { palette } from '@/theme/tokens';

/** The heart pill on the reveal card: saves the event to the Museum's Favourites. */
export function FavouriteButton({ questionId }: { questionId: string }) {
  const { state, toggleFavourite } = useProgression();
  const saved = state.favourites.includes(questionId);

  const onPress = () => {
    haptic.selection();
    const now = toggleFavourite(questionId);
    track(now ? 'favourite_added' : 'favourite_removed', { question_id: questionId });
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? t('round.reveal.favouriteRemove') : t('round.reveal.favouriteAdd')}
      hitSlop={10}
      testID="favourite-button"
      className="flex-row items-center gap-1.5 rounded-full border border-hair px-3 py-1"
      style={saved ? { borderColor: palette.accent.default } : undefined}
    >
      <Text
        style={{ fontSize: 14, includeFontPadding: false, color: saved ? palette.accent.default : undefined }}
        className={saved ? '' : 'text-ink-muted'}
      >
        {saved ? '♥' : '♡'}
      </Text>
      <Text className={`text-xs font-semibold ${saved ? 'text-accent' : 'text-ink-secondary'}`}>
        {saved ? t('round.reveal.favourited') : t('round.reveal.favourite')}
      </Text>
    </Pressable>
  );
}
