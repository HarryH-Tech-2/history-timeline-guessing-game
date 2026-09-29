import Share from 'react-native-share';

import {
  challengeShareMessage,
  challengeUrl,
  groupUrl,
  normaliseCode,
  shareChallenge,
} from './shareInvite';

describe('share invites', () => {
  it('builds links on the hosting domain', () => {
    expect(challengeUrl('ABC234')).toBe('https://history-date-timeline-guesser.web.app/c/ABC234');
    expect(groupUrl('XYZ789')).toBe('https://history-date-timeline-guesser.web.app/g/XYZ789');
  });

  it('writes a message that includes the code for players on older builds', () => {
    const msg = challengeShareMessage('Sam', challengeUrl('ABC234'));
    expect(msg).toContain('ABC234');
    expect(msg).toContain('https://history-date-timeline-guesser.web.app/c/ABC234');
  });

  it('normalises typed codes and rejects bad ones', () => {
    expect(normaliseCode(' abc 234 ')).toBe('ABC234');
    expect(normaliseCode('ABC23')).toBeNull();
    expect(normaliseCode('ABC230')).toBeNull();
  });
});

describe('shareChallenge', () => {
  it('opens the share sheet with the invite and swallows a dismissal', async () => {
    // react-native-share is mocked globally in jest-setup.ts.
    const open = Share.open as unknown as jest.Mock;
    await shareChallenge(challengeUrl('ABC234'), 'Sam');
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ message: challengeShareMessage('Sam', challengeUrl('ABC234')) }),
    );
    open.mockRejectedValueOnce(new Error('User did not share'));
    await expect(shareChallenge(challengeUrl('ABC234'), 'Sam')).resolves.toBeUndefined();
  });
});
