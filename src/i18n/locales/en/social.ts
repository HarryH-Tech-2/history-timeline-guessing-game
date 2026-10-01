/** Museum, leaderboard, and the Social tab (groups + head-to-head challenges). */
export const social = {
  museum: {
    title: 'Museum',
    intro: 'Guess close to the real year to add an artefact to your collection.',
    achievementsIntro: 'Milestones you have reached, and how close the next ones are.',
    collected: '{acquired} of {total} artefacts collected',
    undiscovered: 'Undiscovered',
    tabArtefacts: 'Artefacts',
    tabAchievements: 'Achievements',
  },
  leaderboard: {
    title: 'Leaderboard',
    eyebrow: 'Global · Top 50',
    offline:
      'Leaderboards need a connection and aren’t available in this build. Your progress is saved on this device.',
    boards: {
      today: 'Today',
      week: 'Week',
      all: 'All time',
    },
    blurbs: {
      today: 'Today’s Daily — the same eight questions for everyone',
      week: 'XP earned since Monday',
      all: 'Top history buffs by XP',
    },
    empty: {
      today: 'No Daily scores yet today — play today’s Daily to set the pace!',
      week: 'Nobody has banked XP this week yet. Play a round to open the board.',
      all: 'No scores yet — play a round to claim the top spot!',
    },
    /** Unit after a Daily score: "4,100 pts". */
    points: 'pts',
    podium: {
      first: 'Champion',
      second: 'Runner-up',
      third: 'Third',
    },
    /** "Historian · L13": the era title for a level, with the level kept short. */
    rankLine: '{title} · L{level}',
    /** Rank titles by level band (domain/progression LEVEL_TITLES). */
    titles: {
      apprentice: 'Apprentice',
      scribe: 'Scribe',
      chronicler: 'Chronicler',
      scholar: 'Scholar',
      historian: 'Historian',
      archivist: 'Archivist',
      curator: 'Curator',
      sage: 'Sage',
      timeless: 'Timeless',
      legend: 'Legend',
    },
    you: 'You',
    movedUp: { one: 'Up {count} place', other: 'Up {count} places' },
    movedDown: { one: 'Down {count} place', other: 'Down {count} places' },
    nameNudgeLabel: 'Choose your leaderboard name',
    nameNudgeTitle: 'Choose your name',
    nameNudgeBody: 'You appear as {name}. Tap to pick a name.',
  },
  segments: {
    global: 'Global',
    groups: 'Groups',
    challenges: 'Challenges',
  },
  tryAgain: 'Try again',
  checkCode: 'Check the code',
  groups: {
    namePlaceholder: 'New group name',
    create: 'Create',
    join: 'Join',
    empty: 'Make a group for family, friends or work and compete on this week’s XP.',
    members: { one: '{count} member', other: '{count} members' },
  },
  group: {
    subtitle: 'This week’s XP · resets Monday',
    invite: 'Invite · code {code}',
    leave: 'Leave group',
    leaveTitle: 'Leave {name}?',
    leaveBody: 'You’ll need a new invite to rejoin.',
    leaveConfirm: 'Leave',
    gone: 'You’re not in this group any more.',
  },
  join: {
    title: 'Join this group?',
    badCode: 'That doesn’t look like a group code.',
    join: 'Join group',
    notNow: 'Not now',
  },
  challenges: {
    create: '⚔️ Challenge a friend',
    fromRun: '⚔️ Challenge a friend with these questions',
    play: 'Play',
    empty: 'Challenge a friend to the same 8 questions and see who knows their history.',
    yours: 'Your challenge',
    theirs: '{name}’s challenge',
  },
  challenge: {
    progress: 'Question {n}/{total}',
    next: 'Next',
    finish: 'Finish',
    missing: 'That code doesn’t match any challenge.',
    expired: 'This challenge has expired.',
    update: 'Update the app to play this challenge — it uses newer questions.',
  },
  headToHead: {
    waitingFor: 'Waiting for {name}',
    waitingFriends: 'Waiting for friends',
    friendsPlayed: { one: '{count} friend played', other: '{count} friends played' },
    tie: 'It’s a tie',
    /** {score} is "4,100–3,900", mine first. */
    youWon: 'You won {score}',
    theyWon: '{name} won {score}',
    yourScore: 'Your score: {score}',
    /** One round: "You 1066 · 950". */
    youGuessed: 'You {year} · {score}',
    challengeMore: '⚔️ Challenge more friends',
    done: 'Done',
  },
  errors: {
    notFound: 'That code doesn’t match anything. Check it and try again.',
    alreadyPlayed: 'You’ve already played this challenge.',
    unavailable: 'That’s no longer available.',
    groupFull: 'That group is full.',
    invalid: 'That didn’t look right.',
    network: 'Couldn’t reach the server. Check your connection and try again.',
  },
  /** Share-sheet messages. Keep {url} and the bare {code} so friends can type it. */
  share: {
    challenge: '⚔️ {name} challenged you to 8 history questions in Date Guesser! {url} (code {code})',
    group: 'Join "{name}" on Date Guesser and compete each week: {url} (code {code})',
  },
};
