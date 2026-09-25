/**
 * Pure decision: what to do when a verified Play Games player calls the
 * bridge from a given Firebase account. Kept free of Firebase so it is
 * unit-testable and the policy is readable in one place.
 */
export type LinkAction =
  /** First sighting of this player: bind them to the caller's uid. */
  | 'link'
  /** Already bound to the caller. */
  | 'none'
  /** Bound to another uid and the caller is a guest: sign the guest into it. */
  | 'sign-in'
  /** Bound to another uid but the caller has a real account: leave both alone. */
  | 'conflict';

export interface LinkDecision {
  action: LinkAction;
  /** The uid the player should end up signed in as. */
  uid: string;
  /** Whether a custom token for `uid` should be minted for the caller. */
  mintToken: boolean;
}

export interface LinkInput {
  callerUid: string;
  /** True for anonymous Firebase sessions (guests). */
  callerIsAnonymous: boolean;
  /** The uid currently mapped to the player, or null when unseen. */
  mappedUid: string | null;
  /** Caller wants a token even for its own uid (re-authentication). */
  forceToken?: boolean;
}

export function decideLink({
  callerUid,
  callerIsAnonymous,
  mappedUid,
  forceToken = false,
}: LinkInput): LinkDecision {
  if (mappedUid === null) {
    return { action: 'link', uid: callerUid, mintToken: forceToken };
  }
  if (mappedUid === callerUid) {
    return { action: 'none', uid: callerUid, mintToken: forceToken };
  }
  if (callerIsAnonymous) {
    return { action: 'sign-in', uid: mappedUid, mintToken: true };
  }
  return { action: 'conflict', uid: callerUid, mintToken: false };
}
