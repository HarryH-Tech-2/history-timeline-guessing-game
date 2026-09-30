import { t } from '@/i18n';

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

const BENEFIT_ICONS: Record<BenefitId, string> = {
  hearts: '❤️',
  coins: '🪙',
  campaign: '🗺️',
  endless: '♾️',
  categories: '🔓',
  museum: '🏛️',
};

/** One benefit's copy in the current language. */
export function benefit(id: BenefitId): Benefit {
  return {
    id,
    icon: BENEFIT_ICONS[id],
    short: t(`paywall.benefits.${id}.short`),
    title: t(`paywall.benefits.${id}.title`),
    detail: t(`paywall.benefits.${id}.detail`),
  };
}

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
  era_complete: ['campaign', 'hearts', 'museum'],
  locked_category: ['categories', 'hearts', 'museum'],
  locked_mode: ['endless', 'hearts', 'categories'],
};
const DEFAULT_LEADS: readonly BenefitId[] = ['hearts', 'categories', 'campaign'];

/** All six benefits, the three most relevant to `source` first. */
export function benefitOrder(source: PaywallSource): { lead: Benefit[]; rest: Benefit[] } {
  const lead = LEADS[source] ?? DEFAULT_LEADS;
  return {
    lead: lead.map(benefit),
    rest: ALL_BENEFITS.filter((id) => !lead.includes(id)).map(benefit),
  };
}

/** "for a week" / "for 3 days". */
function trialSpan(days: number): string {
  return days === 7 ? t('paywall.trialSpan.week') : t('paywall.trialSpan.days', { count: days });
}

/**
 * The big title when any plan in the offering has a free trial: the trial
 * leads, whatever the source (the source-aware copy moves to the bubble).
 */
export function trialHeadline(trialDays: number): string {
  return trialDays === 7
    ? t('paywall.headline.trialWeek')
    : t('paywall.headline.trialDays', { count: trialDays });
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
      return t('paywall.headline.hearts');
    case 'campaign':
    case 'era_complete':
      return t('paywall.headline.campaign');
    case 'winback':
      return t('paywall.headline.winback');
    case 'locked_category':
      return t('paywall.headline.lockedCategory');
    case 'locked_mode':
      return t('paywall.headline.lockedMode');
    case 'onboarding':
      return trialDays
        ? t('paywall.headline.onboardingTrial', { span: trialSpan(trialDays) })
        : t('paywall.headline.default');
    default:
      return t('paywall.headline.default');
  }
}

/**
 * The founder's speech bubble: first person, warm, and short enough for two
 * lines in the compact bubble (~70 characters).
 */
export function founderLine(source: PaywallSource, isPremium: boolean, trialDays?: number): string {
  if (isPremium) return t('paywall.founder.premium');
  switch (source) {
    case 'hearts':
      return t('paywall.founder.hearts');
    case 'campaign':
      return t('paywall.founder.campaign');
    case 'era_complete':
      return t('paywall.founder.eraComplete');
    case 'winback':
      return t('paywall.founder.winback');
    case 'locked_category':
      return t('paywall.founder.lockedCategory');
    case 'locked_mode':
      return t('paywall.founder.lockedMode');
    case 'onboarding':
      return trialDays
        ? t('paywall.founder.onboardingTrial', { span: trialSpan(trialDays) })
        : t('paywall.founder.onboarding');
    default:
      return t('paywall.founder.default');
  }
}
