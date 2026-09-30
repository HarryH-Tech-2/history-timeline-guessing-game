export const reminders = {
  nudge: {
    title: 'Remind me tomorrow?',
    body: 'One nudge a day at {hour}:00 when a fresh Daily is waiting. Never on a day you have already played.',
    accept: 'Remind me',
    notNow: 'Not now',
  },
  /** Android notification channel name, shown in the system settings. */
  channel: 'Daily reminder',
  daily: {
    title: 'Your daily is ready 🏛️',
    body: 'Eight new dates. Keep your streak.',
  },
  trial: {
    title: {
      one: 'Your free trial ends in {count} day',
      other: 'Your free trial ends in {count} days',
    },
    body: 'Do nothing to keep Premium, or cancel anytime in {store}.',
  },
  winback: {
    title: '{percent}% off your first year of Premium',
    body: 'A thank-you for playing: every era, category and mode. This week only.',
  },
};
