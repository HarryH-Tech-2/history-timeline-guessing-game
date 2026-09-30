/**
 * Achievement names and descriptions, keyed by the id in
 * src/features/progression/achievements.ts, plus the Achievements tab's own
 * copy under `ui`. (Play Games Console names are set separately.)
 */
export const achievements = {
  'first-round': { title: 'First Steps', description: 'Answer your first question.' },
  bullseye: { title: 'Bullseye', description: 'Nail a year exactly.' },
  sharpshooter: { title: 'Sharpshooter', description: 'Land 25 perfect guesses.' },
  'on-a-roll': { title: 'On a Roll', description: 'Reach a 5-guess combo.' },
  unstoppable: { title: 'Unstoppable', description: 'Reach a 10-guess combo.' },
  centurion: { title: 'Centurion', description: 'Answer 100 questions.' },
  'level-5': { title: 'Rising Historian', description: 'Reach level 5.' },
  'level-10': { title: 'Master of Time', description: 'Reach level 10.' },
  'coin-hoarder': { title: 'Coin Hoarder', description: 'Bank 500 coins at once.' },
  dedicated: { title: 'Dedicated', description: 'Finish 20 games.' },
  'warming-up': { title: 'Warming Up', description: 'Finish your first game.' },
  deadeye: { title: 'Deadeye', description: 'Land 5 perfect guesses.' },
  'time-lord': { title: 'Time Lord', description: 'Land 100 perfect guesses.' },
  'flow-state': { title: 'Flow State', description: 'Reach a 20-guess combo.' },
  'daily-streak-3': { title: 'Creature of Habit', description: 'Keep a 3-day Daily streak.' },
  'daily-streak-7': { title: 'Week of Wisdom', description: 'Keep a 7-day Daily streak.' },
  'daily-streak-30': { title: 'Historian in Residence', description: 'Keep a 30-day Daily streak.' },
  'first-artefact': { title: 'First Exhibit', description: 'Add your first artefact to the museum.' },
  curator: { title: 'Curator', description: 'Collect 25 museum artefacts.' },
  'grand-curator': { title: 'Grand Curator', description: 'Collect 100 museum artefacts.' },
  scholar: { title: 'Scholar', description: 'Answer 250 questions.' },
  chronicler: { title: 'Chronicler', description: 'Answer 500 questions.' },
  'living-legend': { title: 'Living Legend', description: 'Answer 1,000 questions.' },
  marathoner: { title: 'Marathoner', description: 'Finish 50 games.' },
  completionist: { title: 'Completionist', description: 'Finish 100 games.' },
  'treasure-vault': { title: 'Treasure Vault', description: 'Hold 2,000 coins at once.' },
  'level-20': { title: 'Chronomancer', description: 'Reach level 20.' },
  'level-30': { title: 'Timeless', description: 'Reach level 30.' },
  ui: {
    groups: {
      precision: 'Precision',
      dedication: 'Dedication',
      daily: 'Daily habit',
      museum: 'Museum',
      rank: 'Rank & riches',
    },
    earnedCount: '{earned} of {total} earned',
    nextUp: 'Next up',
    earned: '✓ Earned',
    badgeEarnedA11y: '{title}, earned. {description}',
    badgeProgressA11y: '{title}, {current} of {target}. {description}',
    playGamesLabel: 'Open your achievements in Google Play Games',
    playGamesBody: 'Everything you earn here unlocks on your Play Games profile too.',
    /** The home-screen player card, which opens the achievements. */
    header: {
      viewLabel: 'View achievements',
      unlimitedHearts: 'Unlimited hearts',
      hearts: { one: '{count} heart', other: '{count} hearts' },
    },
  },
};
