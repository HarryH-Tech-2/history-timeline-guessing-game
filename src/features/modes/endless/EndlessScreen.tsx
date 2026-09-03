import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { RoundView, useRoundRewards } from '@/features/round';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { useEndlessSession } from './useEndlessSession';

function EndlessPlay({ onHome }: { onHome: () => void }) {
  const { session, best } = useEndlessSession();
  // Endless has no lives at all, so a miss must not cost a heart either.
  const { reward, unlockedTitles, acquired } = useRoundRewards(session, { usesHearts: false });

  // There is no end-of-run summary (the run never ends), so the best score
  // lives in the HUD where the player can see it climb.
  const progressLabel =
    best > 0 ? `Round ${session.roundNumber} · Best ${best.toLocaleString()}` : `Round ${session.roundNumber}`;

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={<ModeHud progressLabel={progressLabel} score={session.totalScore} onBack={onHome} />}
      />
    </Screen>
  );
}

/** Endless mode: a Premium run of random questions with unlimited lives. */
export function EndlessScreen() {
  const router = useRouter();
  const { isPremium } = usePremium();

  if (!isPremium) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="endless-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            Endless is a Premium mode
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Subscribe to chase a high score with unlimited lives — plus unlimited hearts
            everywhere else.
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return <EndlessPlay onHome={() => router.back()} />;
}
