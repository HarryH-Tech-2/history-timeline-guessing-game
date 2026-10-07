import { nextReminderAt, REMINDER_DAYS, REMINDER_HOUR, reminderDates } from './reminderTime';

describe('nextReminderAt', () => {
  it('fires at 8am local time', () => {
    expect(REMINDER_HOUR).toBe(8);
  });

  it('reminds later today when the Daily is unplayed and the hour has not passed', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, 6, 30), playedToday: false });
    expect(at).toEqual(new Date(2026, 8, 21, REMINDER_HOUR, 0, 0, 0));
  });

  it('rolls to tomorrow when today’s reminder hour has already passed', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, REMINDER_HOUR, 5), playedToday: false });
    expect(at).toEqual(new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0));
  });

  it('never fires on a day already played, even if the hour is still ahead', () => {
    const at = nextReminderAt({ now: new Date(2026, 8, 21, 6, 30), playedToday: true });
    expect(at).toEqual(new Date(2026, 8, 22, REMINDER_HOUR, 0, 0, 0));
  });
});

describe('reminderDates', () => {
  it('queues a week of mornings from the next reminder time, across a month end', () => {
    const dates = reminderDates({ now: new Date(2026, 8, 28, 6, 30), playedToday: false });
    expect(dates).toHaveLength(REMINDER_DAYS);
    expect(dates[0]).toEqual(new Date(2026, 8, 28, REMINDER_HOUR, 0, 0, 0));
    expect(dates[6]).toEqual(new Date(2026, 9, 4, REMINDER_HOUR, 0, 0, 0));
  });
});
