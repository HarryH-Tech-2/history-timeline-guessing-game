import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { getCategoryById } from '@/data';
import { OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { RoundView, useRoundRewards } from '@/features/round';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { useCategorySession } from './useCategorySession';

interface CategoryScreenProps {
  categoryId: string;
}

/** Category practice: an endless run of questions from one chosen topic. */
export function CategoryScreen({ categoryId }: CategoryScreenProps) {
  const router = useRouter();
  const { isPremium } = usePremium();
  const category = getCategoryById(categoryId);

  if (!category) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-center text-lg font-bold text-ink-primary">
            Category not found
          </Text>
          <Button label="Back to home" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (category.premiumOnly && !isPremium) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-8" testID="category-locked">
          <Text className="text-4xl">🔒</Text>
          <Text className="text-center text-xl font-bold text-ink-primary">
            {category.name} is a Premium category
          </Text>
          <Text className="text-center text-base text-ink-secondary">
            Subscribe to unlock it — plus unlimited hearts.
          </Text>
          <Button label="See Premium" onPress={() => router.push('/paywall')} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return <CategoryRun categoryId={categoryId} name={category.name} />;
}

/** Split out so the session hook only mounts for a valid, unlocked category. */
function CategoryRun({ categoryId, name }: { categoryId: string; name: string }) {
  const router = useRouter();
  const { session } = useCategorySession(categoryId);
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);
  const hearts = useHearts();

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={
          <ModeHud
            progressLabel={`${name} · Round ${session.roundNumber}`}
            score={session.totalScore}
            hearts={hearts}
            onBack={() => router.back()}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && (
        <OutOfHeartsSheet onLeave={() => router.back()} />
      )}
    </Screen>
  );
}
