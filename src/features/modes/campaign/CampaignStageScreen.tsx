import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { getCategoryById } from '@/data';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';

import { ModeHud } from '../components/ModeHud';
import { HintButton } from '../hints/HintButton';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { getStage, type CampaignStage } from './campaignMap';
import { useCampaignSession } from './useCampaignSession';

function StagePlay({
  stage,
  colour,
  onHome,
  onRetry,
}: {
  stage: CampaignStage;
  colour: string;
  onHome: () => void;
  onRetry: () => void;
}) {
  const { session, totalQuestions, earnedStars } = useCampaignSession(stage);
  const { reward, unlockedTitles, acquired } = useRoundRewards(session);

  if (session.status === 'finished') {
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));

    return (
      <RunSummary
        title={`${stage.title} — cleared`}
        totalScore={session.totalScore}
        accent={colour}
        stars={earnedStars}
        rounds={rounds}
        primaryLabel="Back to map"
        onPrimary={onHome}
        secondaryLabel="Replay"
        onSecondary={onRetry}
      />
    );
  }

  const onLastQuestion = session.results.length >= totalQuestions;

  return (
    <Screen>
      <RoundView
        question={session.question}
        phase={session.phase}
        result={session.result}
        onSubmit={session.submit}
        onNext={session.advance}
        nextLabel={onLastQuestion ? 'Finish' : 'Next'}
        reward={reward}
        unlockedTitles={unlockedTitles}
        acquired={acquired}
        actions={<HintButton question={session.question} />}
        hud={
          <ModeHud
            progressLabel={`Question ${session.roundNumber} of ${totalQuestions}`}
            score={session.totalScore}
            onBack={onHome}
          />
        }
      />
    </Screen>
  );
}

/** Play a single campaign stage identified by the route's world/stage params. */
export function CampaignStageScreen() {
  const router = useRouter();
  const { world, stage: stageId } = useLocalSearchParams<{ world: string; stage: string }>();
  const [runId, setRunId] = useState(0);

  const stage = getStage(world, stageId);

  if (!stage) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-ink-secondary">This stage could not be found.</Text>
        <Button label="Back to map" onPress={() => router.back()} />
      </Screen>
    );
  }

  const colour = getCategoryById(stage.worldId)?.colour ?? palette.accent.default;

  return (
    <StagePlay
      key={runId}
      stage={stage}
      colour={colour}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
    />
  );
}
