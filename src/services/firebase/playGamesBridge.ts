/**
 * Client side of the Play Games → Firebase account bridge (see
 * functions/src/index.ts). Imported lazily by the auth provider so the
 * `firebase/functions` bundle stays out of offline builds and Jest.
 */
export type BridgeAction = 'link' | 'none' | 'sign-in' | 'conflict';

export interface BridgeResult {
  action: BridgeAction;
  uid: string;
  /** Custom token to sign in with, or null when the caller should stay put. */
  token: string | null;
}

const REGION = 'us-central1';

export async function exchangePlayGamesCode(
  serverAuthCode: string,
  options: { forceToken?: boolean } = {},
): Promise<BridgeResult> {
  const [{ getFirebaseApp }, functions] = await Promise.all([
    import('./client'),
    import('firebase/functions'),
  ]);
  const callable = functions.httpsCallable<
    { serverAuthCode: string; forceToken?: boolean },
    BridgeResult
  >(functions.getFunctions(getFirebaseApp(), REGION), 'exchangePlayGamesCode');
  const { data } = await callable({ serverAuthCode, forceToken: options.forceToken === true });
  return data;
}
