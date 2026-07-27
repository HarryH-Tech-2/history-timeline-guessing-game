import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { RunSummary, type SummaryRow } from '../components/RunSummary';
import { isOutOfLives } from './survivalRules';
import { useSurvivalSession } from './useSurvivalSession';

function SurvivalPlay({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const { session, lives, startingLives, best } = useSurvivalSession();
  const { reward, unlockedTitles } = useRoundRewards(session);

  if (session.status === 'finished') {
    const stats = [{ label: 'Rounds survived', value: String(session.results.length) }];
    if (best) {
      stats.push({
        label: 'Best',
        value: `${best.rounds} rounds · ${best.score.toLocaleString()}`,
      });
    }
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: `${r.errorYears} yrs off`,
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

  const nextLabel = isOutOfLives(session.results) ? 'See results' : 'Next';

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        roundNumber={session.roundNumber}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={nextLabel}
        reward={reward}
        unlockedTitles={unlockedTitles}
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

/** Survival mode: three loose guesses and you're out. Remounts on retry. */
export function SurvivalScreen() {
  const router = useRouter();
  const [runId, setRunId] = useState(0);

  return (
    <SurvivalPlay
      key={runId}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}
