/** The play modes, as reported on every session event. */
export type GameMode = 'daily' | 'survival' | 'endless' | 'campaign' | 'category' | 'topic';

/**
 * Every usage event the app records, with the properties each carries. One
 * place to keep names consistent: an event is only ever tracked via
 * `track(name, props)`, which is typed against this map. Names are
 * snake_case nouns-with-verbs so they read naturally in PostHog.
 *
 * Nothing here identifies a person: no names, emails, free text or location.
 */
export interface AnalyticsEvents {
  /** A play session began (first question shown). */
  mode_started: { mode: GameMode };
  /** A guess was submitted. */
  round_submitted: {
    mode: GameMode;
    question_id: string;
    category_id: string;
    round: number;
    guess_year: number;
    answer_year: number;
    error_years: number;
    score: number;
  };
  /** A play session ended (all questions done or out of lives). */
  run_completed: { mode: GameMode; rounds: number; total_score: number; exact: number };
  /** Today's Daily was finished and banked. */
  daily_completed: { total_score: number; exact: number };
  /** The share button on a summary was tapped. */
  share_tapped: { mode: GameMode };
  /** The share sheet closed with an app chosen — the result actually went somewhere. */
  share_completed: { mode: GameMode; method: 'image' };
  /** The share sheet was backed out of without sharing. */
  share_dismissed: { mode: GameMode };
  /** The subscription paywall was shown. */
  paywall_viewed: undefined;
  /** A subscription purchase went through. */
  purchase_completed: { plan: string };
  /** A previous purchase was restored. */
  purchase_restored: undefined;
  /** The hearts meter ran out mid-run and blocked play. */
  hearts_exhausted: undefined;
  /** A coin hint was bought. */
  hint_used: { question_id: string };
  /** A sign-in or sign-up finished successfully. */
  sign_in_completed: { method: 'google' | 'email' | 'playgames' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
