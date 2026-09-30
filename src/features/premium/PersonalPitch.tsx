import { useEffect, useState } from 'react';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';

import { getCategoryById, getQuestions, getQuestionsByCategory, imageForQuestion } from '@/data';
import { levelForXp, msUntilNextHeart } from '@/domain';
import { heartCountdown } from '@/features/hearts/heartCountdown';
import { CAMPAIGN, eraName, isWorldPremium } from '@/features/modes/campaign/campaignMap';
import { eraArt } from '@/features/modes/campaign/map/EraBackdrop';
import { useProgression } from '@/features/progression/ProgressionProvider';
import { t } from '@/i18n';

import type { PaywallSource } from './paywallSource';

/** What the paywall knows the player was reaching for when it opened. */
interface PersonalPitchProps {
  source: PaywallSource;
  categoryId?: string;
  eraId?: string;
}

interface ContextLine {
  thumb: { image: ImageSourcePropType } | { emoji: string };
  text: string;
  testID: string;
}

/** Ticks once a second while mounted: the hearts countdown is live. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/** The locked era the player tapped, or the first one they haven't unlocked. */
function lockedEra(eraId: string | undefined) {
  const chosen = eraId === undefined ? undefined : CAMPAIGN.find((w) => w.id === eraId);
  return chosen && isWorldPremium(chosen.id) ? chosen : CAMPAIGN.find((w) => isWorldPremium(w.id));
}

/**
 * Two lines that make the paywall about this player, both plain facts:
 * what they were just reaching for (the category, era or heart they're
 * waiting on, with its picture) and how far they've come so far. Each part
 * hides itself when there's nothing true to say.
 */
export function PersonalPitch({ source, categoryId, eraId }: PersonalPitchProps) {
  const { state } = useProgression();
  const wantsHearts = source === 'hearts';
  const now = useNow(wantsHearts);

  let context: ContextLine | null = null;
  if (source === 'locked_category' && categoryId !== undefined) {
    const category = getCategoryById(categoryId);
    const questions = getQuestionsByCategory(categoryId);
    const pictured = questions.find((q) => imageForQuestion(q.id) !== undefined);
    const image = pictured ? imageForQuestion(pictured.id) : undefined;
    if (category && questions.length > 0) {
      context = {
        thumb: image ? { image } : { emoji: '🏛️' },
        text: t('paywall.personal.category', { name: category.name, count: questions.length }),
        testID: 'paywall-personal-category',
      };
    }
  } else if (wantsHearts) {
    const wait = msUntilNextHeart(state.hearts, now);
    if (wait > 0) {
      context = {
        thumb: { emoji: '❤️' },
        text: t('paywall.personal.hearts', { time: heartCountdown(wait) }),
        testID: 'paywall-personal-hearts',
      };
    }
  } else if (source === 'campaign' || source === 'era_complete') {
    const era = lockedEra(eraId);
    if (era) {
      const events =
        era.stages.reduce((n, s) => n + s.questionIds.length, 0) +
        era.routes.reduce((n, r) => n + r.stages.reduce((m, s) => m + s.questionIds.length, 0), 0);
      const art = eraArt(era.id);
      context = {
        thumb: art ? { image: art } : { emoji: era.icon },
        text: t('paywall.personal.era', { era: eraName(era), stages: era.stages.length, count: events }),
        testID: 'paywall-personal-era',
      };
    }
  }

  const collected = Object.keys(state.collection).length;
  const remaining = getQuestions().length - collected;
  const progress =
    collected > 0 && remaining > 0
      ? t('paywall.personal.progress', { count: collected, level: levelForXp(state.xp), remaining })
      : null;

  if (context === null && progress === null) return null;

  return (
    <View className="gap-2 border border-hair bg-bg-raised p-3" testID="paywall-personal">
      {context !== null && (
        <View className="flex-row items-center gap-3">
          {'image' in context.thumb ? (
            <Image
              source={context.thumb.image}
              resizeMethod="resize"
              style={{ width: 48, height: 48, borderRadius: 8 }}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-lg bg-bg-overlay">
              <Text className="text-2xl">{context.thumb.emoji}</Text>
            </View>
          )}
          <Text className="flex-1 text-sm font-bold text-ink-primary" testID={context.testID}>
            {context.text}
          </Text>
        </View>
      )}
      {progress !== null && (
        <Text className="text-xs text-ink-secondary" testID="paywall-personal-progress">
          {progress}
        </Text>
      )}
    </View>
  );
}
