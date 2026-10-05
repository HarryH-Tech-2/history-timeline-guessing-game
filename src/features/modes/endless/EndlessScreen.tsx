import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { consumeSample, ENDLESS_SAMPLE_ROUNDS, useSampleRun } from '@/features/premium/sample';
import { RoundView, useRoundRewards } from '@/features/round';
import { t } from '@/i18n';
import { track } from '@/services/analytics';

import { ModeHud } from '../components/ModeHud';
import { roundDetail } from '../components/RunSummary';
import { SampleOver } from '../components/SampleOver';
import { AssistBar } from '../hints/AssistBar';
import { useEndlessSession } from './useEndlessSession';

function EndlessPlay({
  onHome,
  sampleRounds,
}: {
  onHome: () => void;
  /** A free player's taster: the run ends after this many rounds. */
  sampleRounds?: number;
}) {
  const { session, best } = useEndlessSession(sampleRounds);
  // Endless has no lives at all, so a miss must not cost a heart either.
  useRoundRewards(session, { usesHearts: false });

  // The taster is spent on the first guess, not on opening the screen.
  const guessed = session.results.length > 0;
  useEffect(() => {
    if (sampleRounds === undefined || !guessed) return;
    consumeSample('endless');
    track('sample_started', { target: 'endless' });
  }, [sampleRounds, guessed]);

  if (sampleRounds !== undefined && session.status === 'finished') {
    return (
      <SampleOver
        target="endless"
        name={t('home.modes.endless.title')}
        score={session.totalScore}
        rounds={session.results.map((r, i) => ({
          key: `${i}`,
          label: r.question.title,
          score: r.score.total,
          detail: roundDetail(r.errorYears, r.guessYear),
        }))}
        body={t('modes.sample.endlessBody')}
        paywall={paywallHref('locked_mode')}
        onLeave={onHome}
      />
    );
  }

  // There is no end-of-run summary (the run never ends), so the best score
  // lives in the HUD where the player can see it climb.
  const progressLabel =
    sampleRounds !== undefined
      ? t('modes.sample.round', { round: session.roundNumber, total: sampleRounds })
      : best > 0
        ? t('modes.endless.roundBest', { round: session.roundNumber, best })
        : t('modes.endless.round', { round: session.roundNumber });

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={
          sampleRounds !== undefined && session.results.length >= sampleRounds
            ? t('modes.run.finish')
            : undefined
        }
        assist={(c) => (
          <AssistBar
            question={session.question}
            onSubmit={c.submit}
            onChoose={c.choose}
            onChoicesShown={c.hideTimeline}
          />
        )}
        hud={<ModeHud progressLabel={progressLabel} score={session.totalScore} onBack={onHome} />}
      />
    </Screen>
  );
}

/**
 * Endless mode: a Premium run of random questions with unlimited lives. A
 * free player gets one short taster before the lock.
 */
export function EndlessScreen() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const sampleRun = useSampleRun('endless');

  if (isPremium) return <EndlessPlay onHome={() => router.back()} />;
  // The taster store is still loading: hold the frame rather than flash the lock.
  if (sampleRun === null) return <Screen>{null}</Screen>;
  if (sampleRun) {
    return <EndlessPlay onHome={() => router.back()} sampleRounds={ENDLESS_SAMPLE_ROUNDS} />;
  }

  return (
    <Screen>
      <View className="px-5 pt-6">
        <BackButton onPress={() => router.back()} />
      </View>
      <View className="flex-1 items-center justify-center gap-4 px-8" testID="endless-locked">
        <Text className="text-4xl">🔒</Text>
        <Text className="text-center text-xl font-bold text-ink-primary">
          {t('modes.endless.lockedTitle')}
        </Text>
        <Text className="text-center text-base text-ink-secondary">
          {t('modes.endless.lockedBody')}
        </Text>
        <Button label={t('modes.run.seePremium')} onPress={() => router.push(paywallHref('locked_mode'))} />
      </View>
    </Screen>
  );
}
