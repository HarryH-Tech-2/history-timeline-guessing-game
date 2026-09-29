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
import { challengeProgress } from './challengeProgress';
import { compareEntries, missingQuestions } from './headToHead';
import { HeadToHead } from './HeadToHeadView';
import { challengeUrl, shareChallenge, type ChallengeVia } from './shareInvite';
import { CHALLENGE_SIZE, type Challenge, type ChallengeEntry } from './types';
import { noteChallengeSeen } from './useSocialBadge';

const PERMANENT_SUBMIT_ERRORS = ['failed-precondition', 'not-found'];

type Load =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'expired' }
  | { kind: 'update' }
  /** `prior`: guesses already revealed in an unfinished run of this challenge. */
  | { kind: 'ready'; challenge: Challenge; entries: ChallengeEntry[]; prior: number[] };

/** Players without a uid yet still get resumable runs. */
const progressFor = (uid: string | null, code: string) => challengeProgress(uid ?? 'guest', code);

const guessesOf = (prior: readonly number[], results: readonly RoundResult[]) => [
  ...prior,
  ...results.map((r) => Math.round(r.guessYear)),
];

/**
 * The 8 fixed questions, played plain: no hint or multiple choice (no
 * `assist`), no hearts, no coins or other rewards. Starts after the `prior`
 * rounds already answered, and reports every revealed guess so a quit run
 * resumes where it left off.
 */
function ChallengeRun({
  challenge,
  prior,
  onProgress,
  onFinished,
}: {
  challenge: Challenge;
  prior: readonly number[];
  onProgress: (guessYears: number[]) => void;
  onFinished: (guessYears: number[]) => void;
}) {
  const questions = useMemo(
    () => challenge.questionIds.map((id) => getQuestionById(id)).filter((q): q is Question => !!q),
    [challenge],
  );
  const offset = prior.length;
  const first = useCallback(() => questions[offset]!, [questions, offset]);
  const next = useCallback(
    (results: readonly RoundResult[]) => questions[offset + results.length] ?? null,
    [questions, offset],
  );
  const session = useGameSession({ mode: 'challenge', first, next });

  // Saved on reveal: once a round's answer is shown it can't be re-answered.
  useEffect(() => {
    if (session.results.length > 0) onProgress(guessesOf(prior, session.results));
  }, [session.results, prior, onProgress]);

  const reported = useRef(false);
  useEffect(() => {
    if (session.status !== 'finished' || reported.current) return;
    reported.current = true;
    onFinished(guessesOf(prior, session.results));
  }, [session.status, session.results, prior, onFinished]);

  if (session.status === 'finished') return null;
  return (
    <View className="flex-1">
      <Text className="pt-1 text-center text-xs font-semibold text-ink-muted" testID="challenge-progress">
        Question {offset + session.roundNumber}/{questions.length}
      </Text>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={offset + session.results.length >= questions.length ? 'Finish' : 'Next'}
      />
    </View>
  );
}

/**
 * Reads the challenge and its entries and decides what to show. Rejects when
 * Firestore is unreachable; a challenge this build can't play never throws.
 */
async function fetchLoad(code: string, uid: string | null): Promise<Load> {
  if (!code) return { kind: 'missing' }; // the link or typed code wasn't a valid code
  const [challenge, entries] = await Promise.all([api.fetchChallenge(code), api.fetchEntries(code)]);
  if (!challenge) return { kind: 'missing' };
  const lacking = missingQuestions(challenge, (id) => !!getQuestionById(id));
  if (lacking.length > 0 || challenge.questionIds.length !== CHALLENGE_SIZE) return { kind: 'update' };
  const played = entries.some((e) => e.uid === uid);
  const progress = progressFor(uid, code);
  if (played) {
    // Submitted (maybe from another device): the saved run is finished with.
    progress.clear().catch(() => undefined);
    return { kind: 'ready', challenge, entries, prior: [] };
  }
  if (Date.now() > challenge.expiresAt) {
    progress.clear().catch(() => undefined);
    return { kind: 'expired' };
  }
  const prior = (await progress.read()).slice(0, CHALLENGE_SIZE);
  return { kind: 'ready', challenge, entries, prior };
}

export function ChallengeScreen({ code, via }: { code: string; via: ChallengeVia }) {
  const router = useRouter();
  const { uid } = useAuth();
  const { state } = useProgression();
  const name = resolveDisplayName(state.displayName, uid);
  // A cold app-link open has no history to go back to.
  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  /** A failed submit: the message, and whether retrying could help. */
  const [error, setError] = useState<{ message: string; retry: boolean } | null>(null);
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
          // Expired or deleted meanwhile: retrying can't succeed.
          const permanent = PERMANENT_SUBMIT_ERRORS.includes(api.socialErrorCode(e));
          setError({ message: api.socialErrorMessage(e), retry: !permanent });
          return;
        }
      }
      await progressFor(uid, code)
        .clear()
        .catch(() => undefined);
      setJustPlayed(true);
      setPending(null);
      reload();
    },
    [code, name, reload, uid],
  );

  const onFinished = useCallback((guessYears: number[]) => void submit(guessYears), [submit]);
  const onProgress = useCallback(
    (guessYears: number[]) => {
      progressFor(uid, code)
        .write(guessYears)
        .catch(() => undefined);
    },
    [uid, code],
  );

  const comparison = useMemo(
    () => (load.kind === 'ready' ? compareEntries(load.challenge, load.entries, uid ?? '') : null),
    [load, uid],
  );
  const played = load.kind === 'ready' && load.entries.some((e) => e.uid === uid);
  /** Every round answered but never submitted (the app closed first). */
  const unsent = load.kind === 'ready' && !played && load.prior.length >= CHALLENGE_SIZE;

  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (!unsent || load.kind !== 'ready' || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submit(load.prior);
  }, [unsent, load, submit]);

  // Opening a challenge counts as seeing its entries (own play included), so
  // the Social tab dot doesn't light up for results already on screen.
  const seenCount = useRef<number | null>(null);
  useEffect(() => {
    if (load.kind !== 'ready' || !uid) return;
    const count = load.entries.length;
    if (seenCount.current === count) return;
    seenCount.current = count;
    api.markSeen(uid, code, count).catch(() => undefined);
    noteChallengeSeen(uid, code, count);
  }, [load, uid, code]);

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
        <Button label="Back" variant="ghost" onPress={leave} />
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
        <Button label="Back" onPress={leave} />
      </Screen>
    );
  }
  if (load.kind !== 'ready' || !comparison) return null;

  const { challenge } = load;

  if (pending || unsent) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        {error ? (
          <>
            <Text className="text-center text-base text-ink-primary">{error.message}</Text>
            {error.retry && pending && (
              <Button label="Try again" onPress={() => void submit(pending)} testID="challenge-submit-retry" />
            )}
            <Button label="Back" variant="ghost" onPress={leave} testID="challenge-submit-back" />
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
        <ChallengeRun
          challenge={challenge}
          prior={load.prior}
          onProgress={onProgress}
          onFinished={onFinished}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeadToHead
        comparison={comparison}
        creatorName={challenge.creatorName}
        onDone={leave}
        // Only the creator's own challenge is theirs to pass on.
        onShare={
          uid === challenge.creatorUid ? () => void shareChallenge(challengeUrl(code), name) : undefined
        }
      />
    </Screen>
  );
}
