import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { resolveDisplayName } from '@/features/leaderboard/playerName';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { track } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import { shareChallenge } from './shareInvite';
import { CHALLENGE_SIZE } from './types';

/** A run's guesses as whole years for a challenge entry, or undefined if any round lacks one. */
export function runGuessYears(rounds: readonly { guessYear?: number }[]): number[] | undefined {
  const years = rounds.map((r) => r.guessYear);
  return years.every((y): y is number => typeof y === 'number') ? years.map(Math.round) : undefined;
}

/**
 * "Challenge a friend with these questions" on a run summary: turns the run's
 * questions into a challenge and opens the share sheet. Guests can use it too
 * (they have anonymous uids). Renders nothing unless the run had exactly
 * CHALLENGE_SIZE questions. With `guessYears` the run itself becomes the
 * creator's entry, so friends get a result as soon as they finish.
 */
export function ChallengeFromRun({
  questionIds,
  guessYears,
  source,
}: {
  questionIds: string[];
  /** The run's own guesses, in question order: recorded as the creator's entry. */
  guessYears?: number[];
  source: 'daily' | 'campaign';
}) {
  const { uid } = useAuth();
  const { state } = useProgression();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // `busy` only disables the button after a re-render; this blocks a second tap before that.
  const inFlight = useRef(false);
  if (questionIds.length !== CHALLENGE_SIZE) return null;
  const name = resolveDisplayName(state.displayName, uid);

  const create = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.createChallenge(
        guessYears ? { questionIds, guessYears, name } : { questionIds, name },
      );
      track('challenge_created', { source });
      await shareChallenge(url, name);
    } catch (e) {
      setError(api.socialErrorMessage(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <View className="gap-2">
      <Button
        label="⚔️ Challenge a friend with these questions"
        variant="ghost"
        disabled={busy}
        testID="challenge-from-run"
        onPress={() => void create()}
      />
      {error && <Text className="text-center text-sm text-danger">{error}</Text>}
    </View>
  );
}
