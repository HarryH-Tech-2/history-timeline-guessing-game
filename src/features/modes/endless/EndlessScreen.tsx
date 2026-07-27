import { useRouter } from 'expo-router';

import { Screen } from '@/components/ui';
import { RoundView } from '@/features/round';

import { ModeHud } from '../components/ModeHud';
import { useEndlessSession } from './useEndlessSession';

/** Endless mode: keep guessing for as long as you like; best score is kept. */
export function EndlessScreen() {
  const router = useRouter();
  const { session } = useEndlessSession();

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        roundNumber={session.roundNumber}
        onSubmit={session.submit}
        onNext={session.advance}
        hud={
          <ModeHud
            progressLabel={`Round ${session.roundNumber}`}
            score={session.totalScore}
            onBack={() => router.back()}
          />
        }
      />
    </Screen>
  );
}
