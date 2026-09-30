export const home = {
  seePremium: 'See Premium',
  streakChip: { one: '{count}-day streak', other: '{count}-day streak' },
  theme: {
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
  },
  sections: {
    modes: 'Game modes',
    categories: 'Categories',
  },
  modes: {
    survival: { title: 'Survival', description: 'Three lives. How far can you get?' },
    campaign: { title: 'Campaign', description: 'Work through worlds and earn stars.' },
    endless: { title: 'Endless', description: 'Unlimited lives. Chase a high score.' },
    lockedA11y: '{title}, Premium mode',
  },
  categories: {
    lockedA11y: '{name}, Premium category',
    playA11y: 'Play {name} questions',
    comingSoon: 'More coming soon',
  },
  daily: {
    title: "Today's Daily",
    play: 'Play',
    playA11y: "Play today's Daily",
    doneA11y: 'Daily done, see your result',
    comeBack: 'Come back tomorrow',
    done: 'Daily done',
    todayScore: 'Today · {score} pts',
    streak: { one: '🔥 {count}-day streak', other: '🔥 {count}-day streak' },
    streakKeep: {
      one: '🔥 {count}-day streak — play today to keep it',
      other: '🔥 {count}-day streak — play today to keep it',
    },
    nextIn: 'Next Daily in',
    nextInA11y: 'Next Daily in {time}',
    /** Countdown to the next Daily: "6h 30m", "3h", "12m". */
    hoursMinutes: '{hours}h {minutes}m',
    hours: '{hours}h',
    minutes: '{minutes}m',
  },
  streakSheet: {
    headline: { one: '{count}-day streak!', other: '{count}-day streak!' },
    start: 'Start a streak today',
    safe: "You've played today's Daily — your streak is safe.",
    extend: "Play today's Daily to make it {next}.",
    pitch: 'Play the Daily every day to build a streak and earn bonus points.',
    freezes: { one: '🧊 {count} streak freeze ready', other: '🧊 {count} streak freezes ready' },
    play: "Play today's Daily",
    nice: 'Nice!',
    later: 'Later',
    /** Weekday initials, Sunday first, comma-separated. */
    weekdays: 'S,M,T,W,T,F,S',
  },
  hearts: {
    unlimitedA11y: 'Unlimited hearts',
    leftA11y: '{count} of {max} hearts left',
    outTitle: 'Out of hearts',
    nextIn: 'Your next heart arrives in {time}. Hearts refill one every 15 minutes.',
    refillRate: 'Hearts refill one every 15 minutes.',
    goPremium: 'Go Premium · unlimited hearts',
    refill: 'Refill hearts · {cost} 🪙',
  },
  signInNudge: {
    title: 'Keep your progress',
    body: 'Your progress is saved on this device. Back it up to Google and your campaign, museum, XP and coins follow you to a new phone.',
    notNow: 'Not now',
  },
  winback: {
    title: '{percent}% off your first year',
    subtitle: {
      one: 'A thank-you for playing · ends in {count} day',
      other: 'A thank-you for playing · ends in {count} days',
    },
    a11y: {
      one: '{percent}% off your first year of Premium. Ends in {count} day.',
      other: '{percent}% off your first year of Premium. Ends in {count} days.',
    },
  },
};
