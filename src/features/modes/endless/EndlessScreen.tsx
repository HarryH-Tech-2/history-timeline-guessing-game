import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { RoundView, useRoundRewards } from '@/features/round';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { useEndlessSession } from './useEndlessSession';

/** Endless mode: keep guessing for as long as you like; best score is kept. */
export function EndlessScreen() {
  const router = useRouter();
  const { session } = useEndlessSession();
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);
  const hearts = useHearts();

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={
          <ModeHud
            progressLabel={`Round ${session.roundNumber}`}
            score={session.totalScore}
            hearts={hearts}
            onBack={() => router.back()}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && (
        <OutOfHeartsSheet onLeave={() => router.back()} />
      )}
    </Screen>
  );
}
