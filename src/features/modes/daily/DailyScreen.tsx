import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { getQuestionById } from '@/data';
import { activeStreakCount } from '@/domain';
import { useProgression } from '@/features/progression';
import { ReminderNudge } from '@/features/reminders';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { OutOfHeartsSheet, useHearts } from '@/features/hearts';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import type { DailyRecord } from '../persistence';
import { dailyShareData } from './shareCard';
import { useDailySession } from './useDailySession';

function DailySummary({ record, onHome }: { record: DailyRecord; onHome: () => void }) {
  const { state } = useProgression();
  const streak = activeStreakCount(state.streak, dateKey());
  const rounds: SummaryRow[] = record.rounds.map((r, i) => ({
    key: `${i}`,
    label: getQuestionById(r.questionId)?.title ?? 'Question',
    score: r.score,
    detail: roundDetail(r.errorYears, r.guessYear),
  }));

  return (
    <RunSummary
      title="Daily complete"
      subtitle={
        streak > 0
          ? `🔥 ${streak}-day streak — come back tomorrow to keep it alive.`
          : 'Come back tomorrow for a fresh set.'
      }
      totalScore={record.totalScore}
      stats={[
        {
          label: 'Perfect answers',
          value: `${record.perfectCount} / ${record.rounds.length}`,
        },
      ]}
      rounds={rounds}
      // Just finished today's: the natural moment to offer tomorrow's reminder.
      notice={<ReminderNudge />}
      // Share is the primary action on purpose: the card is the game's
      // main word-of-mouth lever (user decision, 2026-09-01).
      share={{ data: dailyShareData(record), mode: 'daily', primary: true }}
      primaryLabel="Home"
      onPrimary={onHome}
    />
  );
}

/** Daily mode: eight date-seeded questions, one attempt per day. */
export function DailyScreen() {
  const router = useRouter();
  const { session, totalQuestions, loading, locked, record } = useDailySession();
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);
  const hearts = useHearts();

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
          onSubmit={session.submit}
          onNext={session.advance}
          nextLabel={onLastQuestion ? 'Finish' : 'Next'}
          reward={reward}
          unlockedTitles={unlockedTitles}
          acquired={acquired}
          hud={
            <ModeHud
              progress={{
                current: session.roundNumber,
                total: totalQuestions,
                results: session.results,
              }}
              score={session.totalScore}
              onBack={() => router.back()}
            />
          }
        />
        {hearts.empty && session.phase === 'guessing' && (
          <OutOfHeartsSheet onLeave={() => router.back()} />
        )}
      </View>
    </Screen>
  );
}
