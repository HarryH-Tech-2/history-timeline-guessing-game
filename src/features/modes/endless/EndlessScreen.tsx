import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { BackButton, Button, Screen } from '@/components/ui';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { RoundView, useRoundRewards } from '@/features/round';
import { t } from '@/i18n';

import { ModeHud } from '../components/ModeHud';
import { AssistBar } from '../hints/AssistBar';
import { useEndlessSession } from './useEndlessSession';

function EndlessPlay({ onHome }: { onHome: () => void }) {
  const { session, best } = useEndlessSession();
  // Endless has no lives at all, so a miss must not cost a heart either.
  useRoundRewards(session, { usesHearts: false });

  // There is no end-of-run summary (the run never ends), so the best score
  // lives in the HUD where the player can see it climb.
  const progressLabel =
    best > 0
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

/** Endless mode: a Premium run of random questions with unlimited lives. */
export function EndlessScreen() {
  const router = useRouter();
  const { isPremium } = usePremium();

  if (!isPremium) {
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

  return <EndlessPlay onHome={() => router.back()} />;
}
