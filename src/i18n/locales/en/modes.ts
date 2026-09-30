/** Category, Regional, Survival, Endless and Daily run screens. */
export const modes = {
  run: {
    next: 'Next',
    finish: 'Finish',
    seeResults: 'See results',
    playAgain: 'Play again',
    home: 'Home',
    seePremium: 'See Premium',
  },
  category: {
    notFound: 'Category not found',
    backHome: 'Back to home',
    lockedTitle: '{name} is a Premium category',
    lockedBody: 'Subscribe to unlock it — plus unlimited hearts.',
    completeTitle: '{name} — complete',
    completeSubtitle: 'Every {name} question, answered.',
    exactAnswers: 'Exact answers',
    shareTitle: '{name} · complete',
  },
  region: {
    title: 'Regional',
    intro: 'Pick a region and place its defining moments on the timeline.',
    a11y: { one: 'Play {name}, {count} question', other: 'Play {name}, {count} questions' },
    count: { one: '{count} question', other: '{count} questions' },
    countPerRun: {
      one: '{count} question · {perRun} per run',
      other: '{count} questions · {perRun} per run',
    },
  },
  survival: {
    outOfLives: 'Out of lives',
    roundsSurvived: 'Rounds survived',
    best: 'Best',
    bestValue: { one: '{count} round · {score}', other: '{count} rounds · {score}' },
    shareTitle: { one: 'Survival · {count} round', other: 'Survival · {count} rounds' },
  },
  endless: {
    round: 'Round {round}',
    roundBest: 'Round {round} · Best {best}',
    lockedTitle: 'Endless is a Premium mode',
    lockedBody: 'Subscribe to chase a high score with unlimited lives — plus unlimited hearts everywhere else.',
  },
  daily: {
    complete: 'Daily complete',
    streakSubtitle: {
      one: '🔥 {count}-day streak — come back tomorrow to keep it alive.',
      other: '🔥 {count}-day streak — come back tomorrow to keep it alive.',
    },
    freshSet: 'Come back tomorrow for a fresh set.',
    perfectAnswers: 'Perfect answers',
    questionFallback: 'Question',
  },
};
