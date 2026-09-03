import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { getQuestionById } from '@/data';
import { activeStreakCount } from '@/domain';
import { useProgression } from '@/features/progression';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { OutOfHeartsSheet, useHearts } from '@/features/hearts';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import type { DailyRecord } from '../persistence';
import { DailyShareCard, SHARE_CARD_SIZE } from './DailyShareCard';
import { shareDailyResult } from './shareImage';
import { useDailySession } from './useDailySession';

function DailySummary({ record, onHome }: { record: DailyRecord; onHome: () => void }) {
  const { state } = useProgression();
  const cardRef = useRef<View>(null);
  const streak = activeStreakCount(state.streak, dateKey());
  const rounds: SummaryRow[] = record.rounds.map((r, i) => ({
    key: `${i}`,
    label: getQuestionById(r.questionId)?.title ?? 'Question',
    score: r.score,
    detail: roundDetail(r.errorYears, r.guessYear),
  }));

  return (
    <>
      <RunSummary
        title="Daily complete"
        subtitle={
          streak > 0
            ? `🔥 ${streak}-day streak — come back tomorrow to keep it alive.`
            : 'Come back tomorrow for a fresh set.'
        }
        totalScore={record.totalScore}
        stats={[
          { label: 'Perfect answers', value: `${record.perfectCount} / ${record.rounds.length}` },
        ]}
        rounds={rounds}
        primaryLabel="Share result"
        onPrimary={() => void shareDailyResult(cardRef, record)}
        secondaryLabel="Home"
        onSecondary={onHome}
      />
      {/* The image card lives just off the left edge, laid out at full size so
          it can be captured on demand without ever being visible. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: -SHARE_CARD_SIZE * 2, top: 0 }}
      >
        <DailyShareCard ref={cardRef} record={record} />
      </View>
    </>
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
              progressLabel={`Question ${session.roundNumber} of ${totalQuestions}`}
              progress={{
                current: session.roundNumber,
                total: totalQuestions,
                results: session.results,
              }}
              score={session.totalScore}
              hearts={hearts}
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
