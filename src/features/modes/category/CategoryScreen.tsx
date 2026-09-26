import { useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import { getCategoryById, REGIONAL_CATEGORY_ID, regionById } from '@/data';
import { OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { RoundView, useRoundRewards } from '@/features/round';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { HintButton } from '../hints/HintButton';
import { prettyDate, shareDataFromResults } from '../share';
import { RegionPicker } from './RegionPicker';
import { useCategorySession } from './useCategorySession';

interface CategoryScreenProps {
  categoryId: string;
  /** Regional only: which region to play. Absent → show the picker. */
  regionId?: string;
}

/**
 * Category practice: one pass through every question in a chosen category.
 * The Regional category adds a step: pick a region first, then play just
 * that region's questions.
 */
export function CategoryScreen({ categoryId, regionId }: CategoryScreenProps) {
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
        <View className="px-5 pt-6">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="category-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            {category.name} is a Premium category
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Subscribe to unlock it — plus unlimited hearts.
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
        </View>
      </Screen>
    );
  }

  const isRegional = category.id === REGIONAL_CATEGORY_ID;
  const region = isRegional && regionId ? regionById(regionId) : undefined;

  if (isRegional && !region) {
    return (
      <RegionPicker
        onPick={(id) =>
          router.push({ pathname: '/category/[id]', params: { id: categoryId, region: id } })
        }
        onBack={() => router.back()}
      />
    );
  }

  // Remounts on "Play again" so the hook deals a fresh order.
  return (
    <CategoryRun
      key={runId}
      categoryId={categoryId}
      regionId={region?.id}
      name={region ? region.name : category.name}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}

/** Split out so the session hook only mounts for a valid, unlocked category. */
function CategoryRun({
  categoryId,
  regionId,
  name,
  onHome,
  onRetry,
}: {
  categoryId: string;
  regionId?: string;
  name: string;
  onHome: () => void;
  onRetry: () => void;
}) {
  const { session, totalQuestions } = useCategorySession(categoryId, regionId);
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
            progress={{
              current: session.roundNumber,
              total: totalQuestions,
              results: session.results,
            }}
            score={session.totalScore}
            onBack={onHome}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && <OutOfHeartsSheet onLeave={onHome} />}
    </Screen>
  );
}
