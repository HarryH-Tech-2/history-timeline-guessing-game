import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { getCategoryById } from '@/data';
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

  return <CategoryRun categoryId={categoryId} name={category.name} />;
}

/** Split out so the session hook only mounts for a valid category. */
function CategoryRun({ categoryId, name }: { categoryId: string; name: string }) {
  const router = useRouter();
  const { session } = useCategorySession(categoryId);
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);

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
            onBack={() => router.back()}
          />
        }
      />
    </Screen>
  );
}
