import { nextReminderAt, REMINDER_HOUR } from './reminderTime';

describe('nextReminderAt', () => {
  it('reminds later today when the Daily is unplayed and the hour has not passed', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, 9, 0), playedToday: false });
    expect(at).toEqual(new Date(2026, 8, 21, REMINDER_HOUR, 0, 0, 0));
  });

  it('rolls to tomorrow when today’s reminder hour has already passed', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, REMINDER_HOUR, 5), playedToday: false });
    expect(at).toEqual(new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0));
  });

  it('never fires on a day already played, even if the hour is still ahead', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, 9, 0), playedToday: true });
    expect(at).toEqual(new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0));
  });
});
