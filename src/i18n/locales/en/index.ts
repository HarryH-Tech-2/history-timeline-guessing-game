import { common, store, tabs } from './common';
import { profile } from './profile';
import { home } from './home';
import { reminders } from './reminders';
import { round } from './round';
import { onboarding } from './onboarding';
import { paywall } from './paywall';
import { campaign } from './campaign';
import { modes } from './modes';
import { social } from './social';
import { account } from './account';
import { achievements } from './achievements';

/**
 * The English source text. Every other language must match this shape
 * (checked by TranslationShape), so add new keys here first.
 */
export const en = { common, tabs, store, profile, home, reminders, round, onboarding, paywall, campaign, modes, social, account, achievements };
