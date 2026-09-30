import { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button, Screen } from '@/components/ui';
import { SignInNudge } from '@/features/account/SignInNudge';
import { HeartsChip, OutOfHeartsSheet, useHearts } from '@/features/hearts';
import { usePremium } from '@/features/premium';
import { paywallHref } from '@/features/premium/paywallSource';
import { RoundView, useRoundRewards } from '@/features/round';
import { t } from '@/i18n';
import { palette } from '@/theme/tokens';
import { dateKey } from '@/utils/date';

import { ModeHud } from '../components/ModeHud';
import { AssistBar } from '../hints/AssistBar';
import { roundDetail, RunSummary, type SummaryRow } from '../components/RunSummary';
import { prettyDate, shareDataFromResults } from '../share';
import { eraName, getStage, getWorld, isStagePremium, stageTitle, type CampaignStage } from './campaignMap';
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
    const title = stageTitle(stage);
    const world = getWorld(stage.worldId);

    return (
      <RunSummary
        title={t('campaign.play.cleared', { title })}
        totalScore={session.totalScore}
        accent={colour}
        stars={earnedStars}
        rounds={rounds}
        share={{
          data: shareDataFromResults(
            `${title} · ${'★'.repeat(earnedStars)}${'☆'.repeat(3 - earnedStars)}`,
            `${world ? eraName(world) : t('campaign.play.shareSubtitleFallback')} · ${prettyDate(dateKey())}`,
            session.results,
          ),
          mode: 'campaign',
        }}
        primaryLabel={cta.label}
        onPrimary={() => onQuest(cta.action)}
        // After the final stage there's no map to go "back" to besides the
        // primary; at a fork the primary lands on the fork, so the plain way
        // back stays on offer as for any mid-campaign stage.
        {...(cta.action.kind === 'map' && cta.action.focusStageId === undefined
          ? { secondaryLabel: t('campaign.play.replay'), onSecondary: onRetry }
          : {
              secondaryLabel: t('campaign.play.backToMap'),
              onSecondary: onHome,
              tertiaryLabel: t('campaign.play.replayStage'),
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
        nextLabel={onLastQuestion ? t('modes.run.finish') : t('modes.run.next')}
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
        <Text className="text-center text-ink-secondary">{t('campaign.play.notFound')}</Text>
        <Button label={t('campaign.play.backToMap')} onPress={() => router.back()} />
      </Screen>
    );
  }

  // The map routes free players to the paywall, but a deep link or a stale
  // back-stack entry can still land here — never start a Premium stage free.
  if (isStagePremium(stage) && !isPremium) {
    const premiumWorld = getWorld(stage.worldId);
    if (isLoading) return <Screen>{null}</Screen>;
    return (
      <Screen className="items-center justify-center gap-4 px-5">
        <Text className="text-4xl" testID="stage-premium-locked">
          👑
        </Text>
        <Text className="text-center text-lg font-bold text-ink-primary">
          {t('campaign.play.premiumEra', { era: premiumWorld ? eraName(premiumWorld) : t('campaign.play.thisEra') })}
        </Text>
        <Button label={t('campaign.play.seePremium')} onPress={() => router.push(paywallHref('campaign', { era: stage.worldId }))} />
        <Button label={t('campaign.play.backToMap')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const colour = getWorld(stage.worldId)?.colour ?? palette.accent.default;

  const onQuest = (action: QuestAction) => {
    if (action.kind === 'map') {
      // At a fork: back down to the map tab, opened on the fork itself —
      // popping to it rather than pushing, so this stage doesn't stay stacked.
      if (action.focusStageId !== undefined) {
        router.dismissTo({ pathname: '/campaign', params: { focus: action.focusStageId } });
      } else router.back();
    } else if (action.kind === 'paywall') router.push(paywallHref('campaign', { era: action.eraId }));
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
