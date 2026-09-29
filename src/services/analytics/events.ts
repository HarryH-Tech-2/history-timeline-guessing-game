/** The play modes, as reported on every session event. */
export type GameMode = 'daily' | 'survival' | 'endless' | 'campaign' | 'category' | 'topic' | 'challenge';

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
    /** Answered via bought multiple choice. */
    assisted: boolean;
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
  /** Multiple choice was bought for a question. */
  multiple_choice_used: { question_id: string };
  /** A sign-in or sign-up finished successfully. */
  sign_in_completed: { method: 'google' | 'apple' | 'email' | 'playgames' };
  /** A first-run onboarding step came on screen (1-based). */
  onboarding_step_viewed: { step: number };
  /** Onboarding was skipped, from this step. */
  onboarding_skipped: { step: number };
  /** Onboarding finished: where they went, and what they set up. */
  onboarding_completed: { choice: 'daily' | 'explore'; named: boolean; reminders: boolean };
  /** A head-to-head challenge was created (and its share sheet opened). */
  challenge_created: { source: 'random' | 'daily' | 'campaign' };
  /** A challenge screen was opened: from a real link, a typed code, or inside the app (list row / after creating). */
  challenge_opened: { via: 'link' | 'code' | 'list' };
  /** A challenge run was submitted; `won` is null for a tie or when there is no result yet. */
  challenge_completed: { won: boolean | null };
  /** A friends group was created. */
  group_created: undefined;
  /** A friends group was joined, from a link or a typed code. */
  group_joined: { via: 'link' | 'code' };
  /** A friends group was left. */
  group_left: undefined;
}

export type AnalyticsEventName = keyof AnalyticsEvents;
