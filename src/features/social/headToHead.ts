import type { Challenge, ChallengeEntry } from './types';

type Round = {
  questionId: string;
  mine: number;
  theirs: number;
  myScore: number;
  theirScore: number;
  closer: 'me' | 'them' | 'tie';
};

export type Comparison =
  | { kind: 'waiting' }
  | { kind: 'versus'; me: ChallengeEntry; them: ChallengeEntry; outcome: 'won' | 'lost' | 'tie'; rounds: Round[] }
  | { kind: 'creator'; me: ChallengeEntry | null; challengers: ChallengeEntry[] };

/**
 * How the viewer stands on a challenge. The creator sees everyone who took
 * them on (never themselves as an opponent); anyone else is compared round by
 * round with the creator, or waits until the creator has played.
 */
export function compareEntries(
  challenge: Challenge,
  entries: readonly ChallengeEntry[],
  viewerUid: string,
): Comparison {
  const me = entries.find((e) => e.uid === viewerUid) ?? null;
  if (viewerUid === challenge.creatorUid) {
    const challengers = entries
      .filter((e) => e.uid !== viewerUid)
      .sort((a, b) => b.total - a.total);
    return { kind: 'creator', me, challengers };
  }
  const them = entries.find((e) => e.uid === challenge.creatorUid);
  if (!me || !them) return { kind: 'waiting' };
  const outcome = me.total === them.total ? 'tie' : me.total > them.total ? 'won' : 'lost';
  const rounds = challenge.questionIds.map((questionId, i): Round => {
    const myScore = me.roundScores[i] ?? 0;
    const theirScore = them.roundScores[i] ?? 0;
    return {
      questionId,
      mine: me.guessYears[i] ?? 0,
      theirs: them.guessYears[i] ?? 0,
      myScore,
      theirScore,
      closer: myScore === theirScore ? 'tie' : myScore > theirScore ? 'me' : 'them',
    };
  });
  return { kind: 'versus', me, them, outcome, rounds };
}

export function statusLine(c: Comparison, creatorName: string): string {
  if (c.kind === 'waiting') return `Waiting for ${creatorName}`;
  if (c.kind === 'creator') {
    const n = c.challengers.length;
    return n === 0 ? 'Waiting for friends' : `${n} ${n === 1 ? 'friend' : 'friends'} played`;
  }
  const score = `${c.me.total.toLocaleString()}–${c.them.total.toLocaleString()}`;
  if (c.outcome === 'tie') return 'It’s a tie';
  return c.outcome === 'won' ? `You won ${score}` : `${c.them.name} won ${score}`;
}

export function missingQuestions(challenge: Challenge, has: (id: string) => boolean): string[] {
  return challenge.questionIds.filter((id) => !has(id));
}
