export const SOCIAL_HOST = 'https://history-date-timeline-guesser.web.app';
const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const challengeUrl = (code: string) => `${SOCIAL_HOST}/c/${code}`;
export const groupUrl = (code: string) => `${SOCIAL_HOST}/g/${code}`;

/** Includes the bare code so friends on builds without link handling can type it. */
export function challengeShareMessage(name: string, url: string): string {
  const code = url.split('/').pop() ?? '';
  return `⚔️ ${name} challenged you to 8 history questions in Date Guesser! ${url} (code ${code})`;
}

export function groupShareMessage(groupName: string, url: string): string {
  const code = url.split('/').pop() ?? '';
  return `Join "${groupName}" on Date Guesser and compete each week: ${url} (code ${code})`;
}

export function normaliseCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/\s+/g, '');
  return CODE.test(code) ? code : null;
}
