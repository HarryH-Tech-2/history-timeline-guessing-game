import { ACHIEVEMENTS } from './achievements';
import {
  MAX_TOTAL_POINTS,
  PLAY_GAMES_ACHIEVEMENTS,
  playGamesIdFor,
} from './playGamesAchievements';

describe('Play Games achievement catalogue', () => {
  it('has exactly one entry per in-app achievement', () => {
    const appIds = ACHIEVEMENTS.map((a) => a.id).sort();
    expect(Object.keys(PLAY_GAMES_ACHIEVEMENTS).sort()).toEqual(appIds);
  });

  it('awards points Play Console accepts: 5–200 in steps of 5', () => {
    for (const [id, { points }] of Object.entries(PLAY_GAMES_ACHIEVEMENTS)) {
      expect({ id, ok: points >= 5 && points <= 200 && points % 5 === 0 }).toEqual({ id, ok: true });
    }
  });

  it('spends the whole 1,000-point budget without exceeding it', () => {
    const total = Object.values(PLAY_GAMES_ACHIEVEMENTS).reduce((n, a) => n + a.points, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_POINTS);
    expect(total).toBeGreaterThan(MAX_TOTAL_POINTS - 100);
  });

  it('treats an unmapped Console id as "not on Play Games yet"', () => {
    expect(playGamesIdFor('no-such-achievement')).toBeNull();
    // Console ids are filled in by hand once created; a blank means skip.
    const blank = Object.entries(PLAY_GAMES_ACHIEVEMENTS).find(([, a]) => a.playId === '');
    if (blank) expect(playGamesIdFor(blank[0])).toBeNull();
  });
});
