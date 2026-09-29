import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { SignInNudge } from '@/features/account/SignInNudge';
import { HeartsChip, OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { RoundView, useRoundRewards } from '@/features/round';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { AssistBar } from '../hints/AssistBar';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { prettyDate, shareDataFromResults } from '../share';
import { getStage, getWorld, isStagePremium, type CampaignStage } from './campaignMap';
import { questCta, type QuestAction } from './questCta';
import { useCampaignSession } from './useCampaignSession';

function StagePlay({
  stage,
  colour,
  onHome,
  onRetry,
  onQuest,
}: {
  stage: CampaignStage;
  colour: string;
  onHome: () => void;
  onRetry: () => void;
  onQuest: (action: QuestAction) => void;
}) {
  const { session, totalQuestions, earnedStars } = useCampaignSession(stage);
  useRoundRewards(session);
  const hearts = useHearts();
  const { isPremium } = usePremium();

  if (session.status === 'finished') {
    const rounds: SummaryRow[] = session.results.map((r, i) => ({
      key: `${i}`,
      label: r.question.title,
      score: r.score.total,
      detail: roundDetail(r.errorYears, r.guessYear),
    }));

    const cta = questCta(stage, isPremium);

    return (
      <RunSummary
        title={`${stage.title} — cleared`}
        totalScore={session.totalScore}
        accent={colour}
        stars={earnedStars}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            `${stage.title} · ${'★'.repeat(earnedStars)}${'☆'.repeat(3 - earnedStars)}`,
            `${getWorld(stage.worldId)?.name ?? 'Campaign'} · ${prettyDate(dateKey())}`,
            session.results,
          ),
          mode: 'campaign',
        }}
        primaryLabel={cta.label}
        onPrimary={() => onQuest(cta.action)}
        {...(cta.action.kind === 'map'
          ? { secondaryLabel: 'Replay', onSecondary: onRetry }
          : {
              secondaryLabel: 'Back to map',
              onSecondary: onHome,
              tertiaryLabel: 'Replay stage',
              onTertiary: onRetry,
            })}
        // A guest's first cleared stage is the moment their progress starts
        // being worth keeping — the one time we suggest signing in mid-flow.
        notice={<SignInNudge milestone="campaign-first-stage" active />}
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
        assist={(c) => (
          <AssistBar
            question={session.question}
            onSubmit={c.submit}
            onChoose={c.choose}
            onChoicesShown={c.hideTimeline}
          />
        )}
        hud={
          <ModeHud
            progress={{
              current: session.roundNumber,
              total: totalQuestions,
              results: session.results,
            }}
            score={session.totalScore}
            onBack={onHome}
            trailing={<HeartsChip />}
          />
        }
      />
      {hearts.empty && session.phase === 'guessing' && <OutOfHeartsSheet onLeave={onHome} />}
    </Screen>
  );
}

/** Play a single campaign stage identified by the route's world/stage params. */
export function CampaignStageScreen() {
  const router = useRouter();
  const { world, stage: stageId } = useLocalSearchParams<{ world: string; stage: string }>();
  const [runId, setRunId] = useState(0);
  const { isPremium, isLoading } = usePremium();

  const stage = getStage(world, stageId);

  if (!stage) {
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-center text-ink-secondary">This stage could not be found.</Text>
        <Button label="Back to map" onPress={() => router.back()} />
      </Screen>
    );
  }

  // The map routes free players to the paywall, but a deep link or a stale
  // back-stack entry can still land here — never start a Premium stage free.
  if (isStagePremium(stage) && !isPremium) {
    if (isLoading) return <Screen>{null}</Screen>;
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-4xl" testID="stage-premium-locked">
          👑
        </Text>
        <Text className="text-center text-lg font-bold text-ink-primary">
          {getWorld(stage.worldId)?.name ?? 'This era'} is part of Premium
        </Text>
        <Button label="See Premium" onPress={() => router.push(paywallHref('campaign'))} />
        <Button label="Back to map" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const colour = getWorld(stage.worldId)?.colour ?? palette.accent.default;

  const onQuest = (action: QuestAction) => {
    if (action.kind === 'map') router.back();
    else if (action.kind === 'paywall') router.push(paywallHref('campaign'));
    else
      router.replace({
        pathname: '/campaign/[world]/[stage]',
        params: { world: action.stage.worldId, stage: action.stage.id },
      });
  };

  return (
    <StagePlay
      // Keyed by stage too: continuing replaces this route with new params,
      // which can reuse the screen — a fresh stage must start a fresh session.
      key={`${stage.id}:${runId}`}
      stage={stage}
      colour={colour}
      onHome={() => router.back()}
      onRetry={() => setRunId((n) => n + 1)}
      onQuest={onQuest}
    />
  );
}
