import type { PaywallSource } from './paywallSource';

/**
 * Source-aware paywall copy: the headline, the founder's speech bubble and
 * which benefits lead. Honest by rule — no invented ratings or player counts.
 */

export type BenefitId = 'hearts' | 'coins' | 'campaign' | 'endless' | 'categories' | 'museum';

export interface Benefit {
  id: BenefitId;
  icon: string;
  /** One short line for the above-the-fold list. */
  short: string;
  title: string;
  detail: string;
}

export const BENEFITS: Record<BenefitId, Benefit> = {
  hearts: {
    id: 'hearts',
    icon: '❤️',
    short: 'Unlimited hearts, no waiting',
    title: 'Unlimited hearts',
    detail: 'Miss as often as you like — no cooldowns, no refills.',
  },
  coins: {
    id: 'coins',
    icon: '🪙',
    short: 'Unlimited coins for hints',
    title: 'Unlimited coins',
    detail: 'Hints and streak freezes whenever you want them. Never count coins again.',
  },
  campaign: {
    id: 'campaign',
    icon: '🗺️',
    short: 'The full campaign, every era',
    title: 'The full campaign',
    detail: 'March on past the Ancient World, from the Middle Ages to the Modern Era.',
  },
  endless: {
    id: 'endless',
    icon: '♾️',
    short: 'Endless mode, unlimited lives',
    title: 'Endless mode',
    detail: 'An unlimited run of the full catalogue, with unlimited lives.',
  },
  categories: {
    id: 'categories',
    icon: '🔓',
    short: 'Every category unlocked',
    title: 'More categories unlocked',
    detail: 'Practice every premium category on its own, with more arriving over time.',
  },
  museum: {
    id: 'museum',
    icon: '🏛️',
    short: 'Complete your museum',
    title: 'Complete your museum',
    detail: 'Collect every artefact, including the premium wings.',
  },
};

const ALL_BENEFITS: readonly BenefitId[] = [
  'hearts',
  'coins',
  'campaign',
  'endless',
  'categories',
  'museum',
];

/** The three benefits that matter most for where the player came from. */
const LEADS: Partial<Record<PaywallSource, readonly BenefitId[]>> = {
  hearts: ['hearts', 'coins', 'endless'],
  campaign: ['campaign', 'hearts', 'museum'],
  locked_category: ['categories', 'hearts', 'museum'],
  locked_mode: ['endless', 'hearts', 'categories'],
};
const DEFAULT_LEADS: readonly BenefitId[] = ['hearts', 'categories', 'campaign'];

/** All six benefits, the three most relevant to `source` first. */
export function benefitOrder(source: PaywallSource): { lead: Benefit[]; rest: Benefit[] } {
  const lead = LEADS[source] ?? DEFAULT_LEADS;
  return {
    lead: lead.map((id) => BENEFITS[id]),
    rest: ALL_BENEFITS.filter((id) => !lead.includes(id)).map((id) => BENEFITS[id]),
  };
}

/** "for a week" / "for 3 days". */
function trialSpan(days: number): string {
  return days === 7 ? 'for a week' : `for ${days} days`;
}

const DEFAULT_HEADLINE = 'Everything in the museum, and never wait for a heart again';

/**
 * The big title when any plan in the offering has a free trial: the trial
 * leads, whatever the source (the source-aware copy moves to the bubble).
 */
export function trialHeadline(trialDays: number): string {
  return trialDays === 7 ? 'Start My Free Week' : `Start My ${trialDays}-Day Free Trial`;
}

/** The first free-trial length any plan in the offering carries, if one does. */
export function anyTrialDays(
  trialDays: Partial<Record<string, number>>,
): number | undefined {
  return Object.values(trialDays).find((d): d is number => typeof d === 'number' && d > 0);
}

/** The big line under the founder's bubble when no plan has a trial. `trialDays` is the selected plan's trial, if any. */
export function paywallHeadline(source: PaywallSource, trialDays?: number): string {
  switch (source) {
    case 'hearts':
      return 'Never wait for a heart again';
    case 'campaign':
      return 'Continue your journey through history';
    case 'locked_category':
      return 'Unlock every category';
    case 'locked_mode':
      return 'Play Endless with unlimited lives';
    case 'onboarding':
      return trialDays ? `Welcome! Try everything free ${trialSpan(trialDays)}` : DEFAULT_HEADLINE;
    default:
      return DEFAULT_HEADLINE;
  }
}

/**
 * The founder's speech bubble: first person, warm, and short enough for two
 * lines in the compact bubble (~70 characters).
 */
export function founderLine(source: PaywallSource, isPremium: boolean, trialDays?: number): string {
  if (isPremium) return 'Thank you for backing an indie developer — enjoy the whole archive!';
  switch (source) {
    case 'hearts':
      return 'Hi, I’m Harry 👋 Out of hearts? With Premium you never have to wait.';
    case 'campaign':
      return 'Hi, I’m Harry 👋 So glad you’re on the journey — lots more lies ahead.';
    case 'locked_category':
      return 'Hi, I’m Harry 👋 I keep adding categories — Premium opens every one.';
    case 'locked_mode':
      return 'Hi, I’m Harry 👋 Endless is my favourite way to play. Hope you love it!';
    case 'onboarding':
      return trialDays
        ? `Hi, I’m Harry 👋 I make Date Guesser solo. Try it all free ${trialSpan(trialDays)}!`
        : 'Hi, I’m Harry 👋 I make Date Guesser solo — Premium keeps it growing.';
    default:
      return 'Hi, I’m Harry 👋 I make this game solo. Premium keeps it growing — thanks!';
  }
}
