export const paywall = {
  /** The personal card: what they reached for, and how far they've come. */
  personal: {
    category: {
      one: '{name}: {count} question waiting for you',
      other: '{name}: {count} questions waiting for you',
    },
    hearts: 'Next heart in {time}, or never wait again.',
    era: {
      one: '{era}: {stages} stages and {count} event to explore',
      other: '{era}: {stages} stages and {count} events to explore',
    },
    progress: {
      one: 'You’ve collected {count} artefact and reached level {level}. {remaining} more events are waiting.',
      other: 'You’ve collected {count} artefacts and reached level {level}. {remaining} more events are waiting.',
    },
  },
  /** The plan names on the cards. */
  plans: {
    monthly: 'Monthly',
    yearly: 'Yearly',
    lifetime: 'Lifetime',
  },
  /** A store price's cadence: "£2.49 / month", "£39.99 once". */
  period: {
    monthly: '/ month',
    yearly: '/ year',
    lifetime: 'once',
  },
  /** Small print under the buy button. {settings} carries its own "in". */
  planFooter: {
    monthly: 'Billed monthly through {store}. Cancel anytime {settings}.',
    yearly: 'Billed yearly through {store}. Cancel anytime {settings}.',
    lifetime: 'A one-time purchase through {store}. Yours forever — nothing renews.',
  },
  trialFooter: {
    one: 'Free for {count} day, then {price} through {store}. Cancel before the trial ends and you won’t be charged.',
    other: 'Free for {count} days, then {price} through {store}. Cancel before the trial ends and you won’t be charged.',
  },
  appleRenewalTerms:
    'Payment is charged to your Apple Account when you confirm. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period.',
  /** A trial's length as it reads inside "{length} free trial". */
  trialLength: {
    month: { one: '1-month', other: '{count}-month' },
    week: { one: '1-week', other: '{count}-week' },
    day: { one: '{count}-day', other: '{count}-day' },
  },
  badge: {
    save: 'Save {percent}%',
    bestValue: 'Best value',
    trial: '{length} free trial',
    percentOff: '{percent}% off',
  },
  cta: {
    monthly: 'Get my monthly subscription',
    yearly: 'Get my yearly subscription',
    lifetime: 'Get lifetime access',
    thenPrice: 'then {price}',
    trialWeek: 'Start my free week',
    trialDays: 'Start my {count}-day free trial',
    pleaseWait: 'Please wait…',
  },
  card: {
    free: 'Free',
    forDays: { one: 'for {count} day', other: 'for {count} days' },
    firstYear: 'first year',
    /** Screen-reader prefixes before the price. */
    a11yTrial: 'free {length} trial then ',
    a11yOffer: '{price} for the first year, then ',
  },
  perMonthBilledYearly: '{price}/month, billed yearly',
  trialTimeline: {
    today: 'Today',
    unlocked: 'Everything unlocked',
    day: 'Day {day}',
    remind: 'We’ll remind you',
    charge: '{price}, cancel anytime',
  },
  winback: {
    headline: '{percent}% off your first year',
    endsIn: {
      one: 'Thanks for playing · offer ends in {count} day',
      other: 'Thanks for playing · offer ends in {count} days',
    },
    cta: 'Claim {percent}% off',
    ctaSub: '{price} first year',
    footer:
      '{price} for your first year, then {fullPrice} through {store}. Cancel anytime {settings}.',
  },
  legal: {
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
  },
  youArePremium: 'You’re Premium',
  subscriptionActive: 'Your subscription is active',
  done: 'Done',
  alsoInPremium: 'Also in Premium',
  notice: {
    unavailable: 'Purchases aren’t available in this build yet.',
    error: 'Something went wrong. Please try again.',
    noSubscription: 'No active subscription found.',
  },
  trust: {
    lifetime: 'One-time purchase, nothing renews',
    cancelAnytime: 'Cancel anytime in {store}',
  },
  restore: 'Restore purchases',
  benefits: {
    hearts: {
      short: 'Unlimited hearts, no waiting',
      title: 'Unlimited hearts',
      detail: 'Miss as often as you like — no cooldowns, no refills.',
    },
    coins: {
      short: 'Unlimited coins for hints',
      title: 'Unlimited coins',
      detail: 'Hints and streak freezes whenever you want them. Never count coins again.',
    },
    campaign: {
      short: 'The full campaign, every era',
      title: 'The full campaign',
      detail: 'March on past the Ancient World, from the Middle Ages to the Modern Era.',
    },
    endless: {
      short: 'Endless mode, unlimited lives',
      title: 'Endless mode',
      detail: 'An unlimited run of the full catalogue, with unlimited lives.',
    },
    categories: {
      short: 'Every category unlocked',
      title: 'More categories unlocked',
      detail: 'Practice every premium category on its own, with more arriving over time.',
    },
    museum: {
      short: 'Complete your museum',
      title: 'Complete your museum',
      detail: 'Collect every artefact, including the premium wings.',
    },
  },
  headline: {
    default: 'Unlock the full campaign and get unlimited hearts.',
    trialWeek: 'Start My Free Week',
    trialDays: 'Start My {count}-Day Free Trial',
    hearts: 'Never wait for a heart again',
    campaign: 'Continue your journey through history',
    winback: 'Welcome back! Your first year, discounted',
    lockedCategory: 'Unlock every category',
    lockedMode: 'Play Endless with unlimited lives',
    onboardingTrial: 'Welcome! Try everything free {span}',
  },
  /** "for a week" / "for 3 days", inside a headline or the founder's line. */
  trialSpan: {
    week: 'for a week',
    days: 'for {count} days',
  },
  /** Harry's speech bubble: first person, warm, always says who he is; at most ~115 characters (three lines). */
  founder: {
    premium: 'Thank you for backing me, Harry, the maker of this app. Enjoy the whole archive!',
    hearts: 'Hi, I’m Harry, the maker of this app 👋 Out of hearts? With Premium you never wait.',
    campaign: 'Hi, I’m Harry, the maker of this app 👋 So glad you’re on the journey. Lots more lies ahead!',
    eraComplete: 'Hi, I’m Harry, the maker of this app 👋 You conquered the Ancient World! More history awaits.',
    winback: 'Hi, I’m Harry, the maker of this app 👋 Glad you’re still playing. Here’s a thank-you discount.',
    lockedCategory: 'Hi, I’m Harry, the maker of this app 👋 I keep adding categories, and Premium opens them all.',
    lockedMode: 'Hi, I’m Harry, the maker of this app 👋 Endless is my favourite way to play. Hope you love it!',
    onboardingTrial: 'Hi, I’m Harry, the maker of this app 👋 It’s just me building it. Try it all free {span}!',
    onboarding: 'Hi, I’m Harry, the maker of this app 👋 It’s just me, so Premium really helps it grow.',
    default: 'Hi, I’m Harry, the maker of this app 👋 It’s just me, so Premium helps it grow. Thanks!',
    photo: 'Photo of Harry, the developer',
  },
  summaryUpsell: {
    eyebrow: '👑 Premium',
    title: 'Enjoying it?',
    body: 'Premium: unlimited hearts, the full campaign and Endless',
    cta: 'See Premium',
  },
  eraConquered: {
    title: '{name} conquered!',
    titleFallback: 'Era conquered!',
    body: {
      one: 'Next up: {next}. Premium opens {count} more era and {stages} stages of history.',
      other: 'Next up: {next}. Premium opens {count} more eras and {stages} stages of history.',
    },
    bodyFallback: 'More of history awaits with Premium.',
    unlock: 'Unlock every era',
    notNow: 'Not now',
  },
};
