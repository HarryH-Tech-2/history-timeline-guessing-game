import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { isOutOfEndlessLives } from './endlessRules';
import { useEndlessSession } from './useEndlessSession';

function EndlessPlay({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const { session, lives, startingLives, best } = useEndlessSession();
  // Endless has its own lives, so a miss must not also cost a heart.
  const { reward, unlockedTitles, acquired } = useRoundRewards(session, { usesHearts: false });

  if (session.status === 'finished') {
    const stats = [
      { label: 'Rounds played', value: String(session.results.length) },
      { label: 'Best score', value: best.toLocaleString() },
    ];
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));

    return (
      <RunSummary
        title="Out of lives"
        totalScore={session.totalScore}
        accent={palette.danger}
        stats={stats}
        rounds={rounds}
        primaryLabel="Play again"
        onPrimary={onRetry}
        secondaryLabel="Home"
        onSecondary={onHome}
      />
    );
  }

  const nextLabel = isOutOfEndlessLives(session.results) ? 'See results' : 'Next';

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={nextLabel}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={
          <ModeHud
            progressLabel={`Round ${session.roundNumber}`}
            score={session.totalScore}
            lives={lives}
            startingLives={startingLives}
            onBack={onHome}
          />
        }
      />
    </Screen>
  );
}

/** Endless mode: a Premium run of random questions on ten lives. */
export function EndlessScreen() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const [runId, setRunId] = useState(0);

  if (!isPremium) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="endless-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            Endless is a Premium mode
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Subscribe to chase a high score on ten lives — plus unlimited hearts everywhere else.
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <EndlessPlay
      key={runId}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}
