import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { STORE_LABEL } from '@/config/store';
import { refreshTrialReminder } from '@/features/reminders/scheduler';
import { t } from '@/i18n';
import { track } from '@/services/analytics';

import { usePremium } from './PremiumProvider';
import { trialPhase, trialRecapStore, type TrialRecapState } from './trialRecap';

/**
 * The free trial's recap on the home screen, in the days before the first
 * charge: when it ends and what the player has done with it so far. Earlier
 * in the trial it renders nothing, but keeps the pending reminder's numbers
 * up to date.
 */
export function TrialRecapCard() {
  const { isPremium } = usePremium();
  const [state, setState] = useState<TrialRecapState | null>(null);
  // Read once per mount: the recap is checked as the home screen opens.
  const [now] = useState(() => Date.now());
  const reported = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void trialRecapStore.read().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const phase = state && isPremium ? trialPhase(state, now) : null;

  useEffect(() => {
    if (!state || phase?.kind !== 'running' || state.rounds === 0) return;
    void refreshTrialReminder({
      at: new Date(phase.recapAt),
      daysLeft: phase.daysLeftAtRecap,
      rounds: state.rounds,
    });
    // `phase` is derived from `state` and `now`, both fixed after the read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phase?.kind]);

  const showing = phase?.kind === 'ending';
  useEffect(() => {
    if (!showing || reported.current) return;
    reported.current = true;
    track('upsell_shown', { placement: 'trial_recap' });
  }, [showing]);

  if (!state || phase?.kind !== 'ending') return null;
  const stats = [
    state.rounds > 0 ? t('home.trialRecap.rounds', { count: state.rounds }) : null,
    state.heartsSaved > 0 ? t('home.trialRecap.heartsSaved', { count: state.heartsSaved }) : null,
  ].filter((s): s is string => s !== null);

  return (
    <View
      className="flex-row items-center gap-3 border border-accent/60 bg-accent/10 px-4 py-3"
      testID="trial-recap-card"
    >
      <Text className="text-3xl" style={{ includeFontPadding: false }}>
        👑
      </Text>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-ink-primary">
          {t('reminders.trial.title', { count: phase.daysLeft })}
        </Text>
        {stats.length > 0 && (
          <Text className="text-sm font-semibold text-ink-primary" testID="trial-recap-stats">
            {t('home.trialRecap.soFar', { stats: stats.join(' · ') })}
          </Text>
        )}
        <Text className="text-sm text-ink-secondary">
          {t('reminders.trial.body', { store: STORE_LABEL })}
        </Text>
      </View>
    </View>
  );
}
