import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { getCategoryById } from '@/data';
import { OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { RoundView, useRoundRewards } from '@/features/round';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { HintButton } from '../hints/HintButton';
import { prettyDate, shareDataFromResults } from '../share';
import { useCategorySession } from './useCategorySession';

interface CategoryScreenProps {
  categoryId: string;
}

/** Category practice: one pass through every question in a chosen category. */
export function CategoryScreen({ categoryId }: CategoryScreenProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const category = getCategoryById(categoryId);
  const [runId, setRunId] = useState(0);

  if (!category) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-lg font-bold text-ink-primary">
            Category not found
          </Text>
          <Button label="Back to home" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (category.premiumOnly && !isPremium) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="category-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            {category.name} is a Premium category
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Subscribe to unlock it — plus unlimited hearts.
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  // Remounts on "Play again" so the hook deals a fresh order.
  return (
    <CategoryRun
      key={runId}
      categoryId={categoryId}
      name={category.name}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}

/** Split out so the session hook only mounts for a valid, unlocked category. */
function CategoryRun({
  categoryId,
  name,
  onHome,
  onRetry,
}: {
  categoryId: string;
  name: string;
  onHome: () => void;
  onRetry: () => void;
}) {
  const { session, totalQuestions } = useCategorySession(categoryId);
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);
  const hearts = useHearts();

  if (session.status === 'finished') {
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));
    const exact = session.results.filter((r) => r.errorYears === 0).length;
    return (
      <RunSummary
        title={`${name} — complete`}
        subtitle={`Every ${name} question, answered.`}
        totalScore={session.totalScore}
        stats={[{ label: 'Exact answers', value: `${exact} / ${session.results.length}` }]}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            `${name} · complete`,
            prettyDate(dateKey()),
            session.results,
          ),
          mode: 'category',
        }}
        primaryLabel="Play again"
        onPrimary={onRetry}
        secondaryLabel="Home"
        onSecondary={onHome}
      />
    );
  }

  const onLastQuestion = session.results.length >= totalQuestions;

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={onLastQuestion ? 'Finish' : 'Next'}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={
          <ModeHud
            progressLabel={`${name} · ${session.roundNumber} of ${totalQuestions}`}
            progress={{
              current: session.roundNumber,
              total: totalQuestions,
              results: session.results,
            }}
            score={session.totalScore}
            hearts={hearts}
            onBack={onHome}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && <OutOfHeartsSheet onLeave={onHome} />}
    </Screen>
  );
}
