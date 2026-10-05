import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import {
  getCategoryById,
  getQuestionsByCategory,
  getRegionalQuestions,
  localizeRegion,
  REGIONAL_CATEGORY_ID,
  regionById,
} from '@/data';
import { HeartsChip, OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import {
  CATEGORY_SAMPLE_ROUNDS,
  categorySample,
  consumeSample,
  useSampleRun,
} from '@/features/premium/sample';
import { RoundView, useRoundRewards } from '@/features/round';
import { t } from '@/i18n';
import { track } from '@/services/analytics';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { SampleOver } from '../components/SampleOver';
import { AssistBar } from '../hints/AssistBar';
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
 * that region's questions. A free player gets one short taster of each
 * premium category before the lock.
 */
export function CategoryScreen({ categoryId, regionId }: CategoryScreenProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const category = getCategoryById(categoryId);
  const [runId, setRunId] = useState(0);
  const sampleRun = useSampleRun(categorySample(categoryId));

  if (!category) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-lg font-bold text-ink-primary">
            {t('modes.category.notFound')}
          </Text>
          <Button label={t('modes.category.backHome')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const needsPremium = category.premiumOnly && !isPremium;
  // The taster store is still loading: hold the frame rather than flash the lock.
  if (needsPremium && sampleRun === null) return <Screen>{null}</Screen>;

  if (needsPremium && !sampleRun) {
    return (
      <Screen>
        <View className="px-5 pt-6">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="category-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            {t('modes.category.lockedTitle', { name: category.name })}
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            {t('modes.category.lockedBody')}
          </Text>
          <Button label={t('modes.run.seePremium')} onPress={() => router.push(paywallHref('locked_category', { category: categoryId }))} />
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
      name={region ? localizeRegion(region).name : category.name}
      sampleRounds={needsPremium ? CATEGORY_SAMPLE_ROUNDS : undefined}
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
  sampleRounds,
  onHome,
  onRetry,
}: {
  categoryId: string;
  regionId?: string;
  name: string;
  /** A free player's taster of a premium category: the run is this short. */
  sampleRounds?: number;
  onHome: () => void;
  onRetry: () => void;
}) {
  const { session, totalQuestions } = useCategorySession(categoryId, regionId, sampleRounds);
  useRoundRewards(session);
  const hearts = useHearts();

  // The taster is spent on the first guess, not on opening the screen.
  const sampling = sampleRounds !== undefined;
  const guessed = session.results.length > 0;
  useEffect(() => {
    if (!sampling || !guessed) return;
    consumeSample(categorySample(categoryId));
    track('sample_started', { target: categorySample(categoryId) });
  }, [sampling, guessed, categoryId]);

  if (sampling && session.status === 'finished') {
    const pool = regionId ? getRegionalQuestions(regionId) : getQuestionsByCategory(categoryId);
    return (
      <SampleOver
        target={categorySample(categoryId)}
        name={name}
        score={session.totalScore}
        rounds={session.results.map((r, i) => ({
          key: `${i}`,
          label: r.question.title,
          score: r.score.total,
          detail: roundDetail(r.errorYears, r.guessYear),
        }))}
        total={pool.length}
        body={t('modes.sample.categoryBody', { name })}
        paywall={paywallHref('locked_category', { category: categoryId })}
        onLeave={onHome}
      />
    );
  }

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
        title={t('modes.category.completeTitle', { name })}
        subtitle={t('modes.category.completeSubtitle', { name })}
        totalScore={session.totalScore}
        stats={[{ label: t('modes.category.exactAnswers'), value: `${exact} / ${session.results.length}` }]}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            t('modes.category.shareTitle', { name }),
            prettyDate(dateKey()),
            session.results,
          ),
          mode: 'category',
        }}
        primaryLabel={t('modes.run.playAgain')}
        onPrimary={onRetry}
        secondaryLabel={t('modes.run.home')}
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
        nextLabel={onLastQuestion ? t('modes.run.finish') : t('modes.run.next')}
        assist={(c) => (
          <AssistBar
            question={session.question}
            onSubmit={c.submit}
            onChoose={c.choose}
            onChoicesShown={c.hideTimeline}
          />
        )}
        hud={
          <ModeHud
            progress={{
              current: session.roundNumber,
              total: totalQuestions,
              results: session.results,
            }}
            score={session.totalScore}
            onBack={onHome}
            trailing={<HeartsChip />}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && <OutOfHeartsSheet onLeave={onHome} />}
    </Screen>
  );
}
