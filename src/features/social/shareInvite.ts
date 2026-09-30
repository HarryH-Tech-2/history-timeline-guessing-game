import Share from 'react-native-share';

import { t } from '@/i18n';

export const SOCIAL_HOST = 'https://history-date-timeline-guesser.web.app';
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const challengeUrl = (code: string) => `${SOCIAL_HOST}/c/${code}`;
export const groupUrl = (code: string) => `${SOCIAL_HOST}/g/${code}`;

/** Includes the bare code so friends on builds without link handling can type it. */
export function challengeShareMessage(name: string, url: string): string {
  const code = url.split('/').pop() ?? '';
  return t('social.share.challenge', { name, url, code });
}

export function groupShareMessage(groupName: string, url: string): string {
  const code = url.split('/').pop() ?? '';
  return t('social.share.group', { name: groupName, url, code });
}

export type ChallengeVia = 'link' | 'code' | 'list';

/**
 * How a challenge screen was reached, from the route's `via` param. Only the
 * app's own pushes set it ('code' typed, 'list' from the Challenges list or
 * right after creating); a real app link carries none.
 */
export function challengeVia(raw: string | undefined): ChallengeVia {
  return raw === 'code' || raw === 'list' ? raw : 'link';
}

export function normaliseCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/\s+/g, '');
  return CODE.test(code) ? code : null;
}

/** Opens the OS share sheet with a challenge invite. Never throws. */
export async function shareChallenge(url: string, name: string): Promise<void> {
  try {
    await Share.open({ message: challengeShareMessage(name, url), failOnCancel: false });
  } catch {
    // dismissed or no share target
  }
}

/** Opens the OS share sheet with a group invite. Never throws. */
export async function shareGroup(url: string, groupName: string): Promise<void> {
  try {
    await Share.open({ message: groupShareMessage(groupName, url), failOnCancel: false });
  } catch {
    // dismissed
  }
}
