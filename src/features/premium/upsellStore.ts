import { z } from 'zod';

import { createStore } from '@/storage';

const SummaryUpsellSchema = z.object({
  /** Local day (`YYYY-MM-DD`) the run-summary Premium card last showed; null = never. */
  lastShownDay: z.string().nullable(),
});
export type SummaryUpsellState = z.infer<typeof SummaryUpsellSchema>;

/**
 * Device-local on purpose: it only paces how often this phone pitches
 * Premium after a run (at most once a calendar day).
 */
export const summaryUpsellStore = createStore<SummaryUpsellState>({
  key: 'chronos.upsell.summary',
  schema: SummaryUpsellSchema,
  fallback: { lastShownDay: null },
});
