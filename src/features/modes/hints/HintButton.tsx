import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import type { Question } from '@/domain';
import { useProgression } from '@/features/progression';
import { palette } from '@/theme/tokens';

import { centuryHint, HINT_COST } from './hint';

/**
 * A coin-gated hint that reveals the century a question falls in. Spends coins
 * on first press (and only if affordable), then shows the clue for the rest of
 * the round. Resets whenever a new question arrives.
 */
export function HintButton({ question }: { question: Question }) {
  const { state, spend } = useProgression();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [question.id]);

  if (revealed) {
    return (
      <View className="border border-hair bg-bg-raised px-4 py-3">
        <Text className="text-center text-sm text-ink-secondary">
          Hint: this happened in{' '}
          <Text className="font-bold text-ink-primary">{centuryHint(question.year)}</Text>
        </Text>
      </View>
    );
  }

  const canAfford = state.coins >= HINT_COST;

  return (
    <Button
      label={canAfford ? `Hint · ${HINT_COST} 🪙` : `Need ${HINT_COST} 🪙 for a hint`}
      variant="ghost"
      disabled={!canAfford}
      testID="hint-button"
      onPress={() => {
        if (spend(HINT_COST)) setRevealed(true);
      }}
    />
  );
}
