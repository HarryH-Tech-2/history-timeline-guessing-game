import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { getQuestionById } from '@/data';
import type { Question, RoundResult } from '@/domain';
import { resolveDisplayName } from '@/features/leaderboard/playerName';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { RoundView, useGameSession } from '@/features/round';
import { track } from '@/services/analytics';
import { useAuth } from '@/services/firebase/auth';

import * as api from './api';
import { compareEntries, missingQuestions } from './headToHead';
import { HeadToHead } from './HeadToHeadView';
import { challengeUrl, shareChallenge } from './shareInvite';
import { CHALLENGE_SIZE, type Challenge, type ChallengeEntry } from './types';

type Load =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'expired' }
  | { kind: 'update' }
  | { kind: 'ready'; challenge: Challenge; entries: ChallengeEntry[] };

/**
 * The 8 fixed questions, played plain: no hint or multiple choice (no
 * `assist`), no hearts, no coins or other rewards.
 */
function ChallengeRun({
  challenge,
  onFinished,
}: {
  challenge: Challenge;
  onFinished: (results: readonly RoundResult[]) => void;
}) {
  const questions = useMemo(
    () => challenge.questionIds.map((id) => getQuestionById(id)).filter((q): q is Question => !!q),
    [challenge],
  );
  const first = useCallback(() => questions[0]!, [questions]);
  const next = useCallback(
    (results: readonly RoundResult[]) => questions[results.length] ?? null,
    [questions],
  );
  const session = useGameSession({ mode: 'challenge', first, next });

  const reported = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || reported.current) return;
    reported.current = true;
    onFinished(session.results);
  }, [session.status, session.results, onFinished]);

  if (session.status === 'finished') return null;
  return (
    <RoundView
      question={session.question}
      phase={session.phase}
      result={session.result}
      onSubmit={session.submit}
      onNext={session.advance}
      nextLabel={session.results.length >= questions.length ? 'Finish' : 'Next'}
    />
  );
}

/**
 * Reads the challenge and its entries and decides what to show. Rejects when
 * Firestore is unreachable; a challenge this build can't play never throws.
 */
async function fetchLoad(code: string, uid: string | null): Promise<Load> {
  const [challenge, entries] = await Promise.all([api.fetchChallenge(code), api.fetchEntries(code)]);
  if (!challenge) return { kind: 'missing' };
  const lacking = missingQuestions(challenge, (id) => !!getQuestionById(id));
  if (lacking.length > 0 || challenge.questionIds.length !== CHALLENGE_SIZE) return { kind: 'update' };
  const played = entries.some((e) => e.uid === uid);
  if (!played && Date.now() > challenge.expiresAt) return { kind: 'expired' };
  return { kind: 'ready', challenge, entries };
}

export function ChallengeScreen({ code, via }: { code: string; via: 'link' | 'code' }) {
  const router = useRouter();
  const { uid } = useAuth();
  const { state } = useProgression();
  const name = resolveDisplayName(state.displayName, uid);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<number[] | null>(null);
  /** Set by a submission from this screen, so completion is tracked once and only then. */
  const [justPlayed, setJustPlayed] = useState(false);

  const reload = useCallback(() => {
    setLoad({ kind: 'loading' });
    fetchLoad(code, uid).then(setLoad, () => setLoad({ kind: 'error' }));
  }, [code, uid]);

  useEffect(() => {
    track('challenge_opened', { via });
  }, [via]);
  // First load (state already starts at 'loading').
  useEffect(() => {
    let live = true;
    fetchLoad(code, uid).then(
      (next) => live && setLoad(next),
      () => live && setLoad({ kind: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [code, uid]);

  const submit = useCallback(
    async (guessYears: number[]) => {
      setPending(guessYears);
      setError(null);
      try {
        await api.submitChallengeEntry({ code, guessYears, name });
      } catch (e) {
        // A second device (or a retried request that did land) already
        // recorded this player: that is a finished run, not an error.
        if (!api.isAlreadyPlayed(e)) {
          setError(api.socialErrorMessage(e));
          return;
        }
      }
      setJustPlayed(true);
      setPending(null);
      reload();
    },
    [code, name, reload],
  );

  const onFinished = useCallback(
    (results: readonly RoundResult[]) => void submit(results.map((r) => Math.round(r.guessYear))),
    [submit],
  );

  const comparison = useMemo(
    () => (load.kind === 'ready' ? compareEntries(load.challenge, load.entries, uid ?? '') : null),
    [load, uid],
  );
  const played = load.kind === 'ready' && load.entries.some((e) => e.uid === uid);

  const trackedCompletion = useRef(false);
  useEffect(() => {
    if (!justPlayed || !played || !comparison || trackedCompletion.current) return;
    trackedCompletion.current = true;
    track('challenge_completed', {
      won:
        comparison.kind === 'versus' && comparison.outcome !== 'tie'
          ? comparison.outcome === 'won'
          : null,
    });
  }, [justPlayed, played, comparison]);

  if (load.kind === 'loading') {
    return (
      <Screen className="items-center justify-center">
        <ActivityIndicator />
      </Screen>
    );
  }
  if (load.kind === 'error') {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-lg text-ink-primary">{api.socialErrorMessage(null)}</Text>
        <Button label="Try again" onPress={reload} testID="challenge-retry" />
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }
  const message =
    load.kind === 'missing'
      ? 'That code doesn’t match any challenge.'
      : load.kind === 'expired'
        ? 'This challenge has expired.'
        : load.kind === 'update'
          ? 'Update the app to play this challenge — it uses newer questions.'
          : null;
  if (message) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-lg text-ink-primary">{message}</Text>
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (load.kind !== 'ready' || !comparison) return null;

  const { challenge } = load;

  if (pending) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        {error ? (
          <>
            <Text className="text-center text-base text-ink-primary">{error}</Text>
            <Button label="Try again" onPress={() => void submit(pending)} testID="challenge-submit-retry" />
          </>
        ) : (
          <ActivityIndicator />
        )}
      </Screen>
    );
  }

  if (!played) {
    return (
      <Screen>
        <View className="px-5 pt-3">
          <Text className="text-center text-xs font-semibold uppercase tracking-wide text-accent">
            {uid === challenge.creatorUid ? 'Your challenge' : `${challenge.creatorName}’s challenge`}
          </Text>
        </View>
        <ChallengeRun challenge={challenge} onFinished={onFinished} />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeadToHead
        comparison={comparison}
        creatorName={challenge.creatorName}
        onDone={() => router.back()}
        onShare={() => void shareChallenge(challengeUrl(code), name)}
      />
    </Screen>
  );
}
