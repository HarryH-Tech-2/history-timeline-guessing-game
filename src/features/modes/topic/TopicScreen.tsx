import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { RoundView, useRoundRewards } from '@/features/round';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { HintButton } from '../hints/HintButton';
import { prettyDate, shareDataFromResults } from '../share';
import { useTopicSession } from './useTopicSession';

function TopicPlay({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const { session, topic, totalQuestions } = useTopicSession();
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);
  const hearts = useHearts();

  if (session.status === 'finished') {
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));
    return (
      <RunSummary
        title={`${topic.icon} ${topic.name} — complete`}
        subtitle="Today’s topic. A new one arrives tomorrow."
        totalScore={session.totalScore}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            `${topic.icon} ${topic.name}`,
            `Topic of the day · ${prettyDate(dateKey())}`,
            session.results,
          ),
          mode: 'topic',
        }}
        primaryLabel="Home"
        onPrimary={onHome}
        secondaryLabel="Replay"
        onSecondary={onRetry}
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
            progressLabel={`${topic.name} · ${session.roundNumber} of ${totalQuestions}`}
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

/** Topic of the day: five themed questions, replayable. Remounts on replay. */
export function TopicScreen() {
  const router = useRouter();
  const [runId, setRunId] = useState(0);
  return (
    <TopicPlay
      key={runId}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}
