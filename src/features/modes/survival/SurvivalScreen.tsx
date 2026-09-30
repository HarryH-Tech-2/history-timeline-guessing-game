import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { RoundView, useRoundRewards } from '@/features/round';
import { t } from '@/i18n';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { AssistBar } from '../hints/AssistBar';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { prettyDate, shareDataFromResults } from '../share';
import { isOutOfLives } from './survivalRules';
import { useSurvivalSession } from './useSurvivalSession';

function SurvivalPlay({ onHome, onRetry }: { onHome: () => void; onRetry: () => void }) {
  const { session, lives, startingLives, best } = useSurvivalSession();
  // Survival has its own lives, so a miss must not also cost a heart.
  useRoundRewards(session, { usesHearts: false });

  if (session.status === 'finished') {
    const stats = [{ label: t('modes.survival.roundsSurvived'), value: String(session.results.length) }];
    if (best) {
      stats.push({
        label: t('modes.survival.best'),
        value: t('modes.survival.bestValue', { count: best.rounds, score: best.score }),
      });
    }
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));

    return (
      <RunSummary
        title={t('modes.survival.outOfLives')}
        totalScore={session.totalScore}
        accent={palette.danger}
        stats={stats}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            t('modes.survival.shareTitle', { count: session.results.length }),
            prettyDate(dateKey()),
            session.results,
          ),
          mode: 'survival',
        }}
        primaryLabel={t('modes.run.playAgain')}
        onPrimary={onRetry}
        secondaryLabel={t('modes.run.home')}
        onSecondary={onHome}
      />
    );
  }

  const nextLabel = isOutOfLives(session.results) ? t('modes.run.seeResults') : t('modes.run.next');

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={nextLabel}
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
