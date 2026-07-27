import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { getQuestionById } from '@/data';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';

import { ModeHud } from '../components/ModeHud';
import { RunSummary, type SummaryRow } from '../components/RunSummary';
import type { DailyRecord } from '../persistence';
import { useDailySession } from './useDailySession';

function DailySummary({ record, onHome }: { record: DailyRecord; onHome: () => void }) {
  const rounds: SummaryRow[] = record.rounds.map((r, i) => ({
    key: `${i}`,
    label: getQuestionById(r.questionId)?.title ?? 'Question',
    score: r.score,
    detail: `${r.errorYears} yrs off`,
  }));

  return (
    <RunSummary
      title="Daily complete"
      subtitle="Come back tomorrow for a fresh set."
      totalScore={record.totalScore}
      stats={[
        { label: 'Perfect answers', value: `${record.perfectCount} / ${record.rounds.length}` },
      ]}
      rounds={rounds}
      primaryLabel="Home"
      onPrimary={onHome}
    />
  );
}

/** Daily mode: eight date-seeded questions, one attempt per day. */
export function DailyScreen() {
  const router = useRouter();
  const { session, totalQuestions, loading, locked, record } = useDailySession();
  const { reward, unlockedTitles } = useRoundRewards(session);

  if (loading) {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator color={palette.accent.default} />
      </Screen>
    );
  }

  if (locked && record) {
    return <DailySummary record={record} onHome={() => router.back()} />;
  }

  const onLastQuestion = session.results.length >= totalQuestions;

  return (
    <Screen>
      <View className="flex-1">
        <RoundView
          question={session.question}
          phase={session.phase}
          result={session.result}
          roundNumber={session.roundNumber}
          onSubmit={session.submit}
          onNext={session.advance}
          nextLabel={onLastQuestion ? 'Finish' : 'Next'}
          reward={reward}
          unlockedTitles={unlockedTitles}
          hud={
            <ModeHud
              progressLabel={`Question ${session.roundNumber} of ${totalQuestions}`}
              score={session.totalScore}
              onBack={() => router.back()}
            />
          }
        />
      </View>
    </Screen>
  );
}
