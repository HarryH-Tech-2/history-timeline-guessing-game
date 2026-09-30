import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Modal, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui';
import { Confetti } from '@/features/round/components/Confetti';
import { t } from '@/i18n';

import type { CampaignWorld } from '../campaignMap';
import { FINALE_MEDAL, LIP } from './constants';
import { Rays } from './EraReward';
import { shade } from './mapVisuals';

const GOLD = '#F5C542';

/**
 * The whole campaign's finale: shown once, over the map, the moment the last
 * era's last stage is cleared. Rays turn behind a big gold trophy, confetti
 * bursts from it in waves, and a ribbon of every era's colour runs under the
 * title — the journey, oldest to newest.
 */
export function CampaignFinale({
  visible,
  worlds,
  earned,
  total,
  onClose,
}: {
  visible: boolean;
  worlds: readonly CampaignWorld[];
  /** Stars across the whole journey. */
  earned: number;
  total: number;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const size = FINALE_MEDAL + 24;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        testID="campaign-finale"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(12,9,6,0.86)' }}
      >
        {visible && (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', top: '38%', left: 0, right: 0, height: 0 }}>
              <Confetti reducedMotion={reducedMotion} count={60} />
            </View>
            <View pointerEvents="none" style={{ position: 'absolute', top: '30%', left: 0, right: 0, height: 0 }}>
              <Confetti key="second" reducedMotion={reducedMotion} count={40} />
            </View>
          </>
        )}

        <Animated.View entering={ZoomIn.springify().damping(9)} style={{ width: size, height: size + LIP }}>
          <Rays size={size} colour={worlds.at(-1)?.colour ?? GOLD} forever />
          <View
            style={{
              position: 'absolute',
              top: LIP,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: shade(GOLD, 0.32),
            }}
          />
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: GOLD,
              borderWidth: 5,
              borderColor: 'rgba(255,255,255,0.6)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name="trophy-award"
              size={Math.round(size * 0.55)}
              color="#FFFFFF"
              style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(350).duration(400)} className="mt-14 items-center">
          <Text className="text-[12px] font-extrabold uppercase tracking-widest" style={{ color: GOLD }}>
            {t('campaign.finale.kicker')}
          </Text>
          <Text className="mt-1 text-center text-3xl font-extrabold text-white">
            {t('campaign.finale.title')}
          </Text>
          <View className="mt-4 flex-row overflow-hidden rounded-full" style={{ height: 8, width: 220 }}>
            {worlds.map((w) => (
              <View key={w.id} style={{ flex: 1, backgroundColor: w.colour }} />
            ))}
          </View>
          <Text className="mt-4 text-center text-base font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {t('campaign.finale.body')}
          </Text>
          <Text className="mt-3 text-sm font-extrabold" style={{ color: GOLD }} testID="campaign-finale-stars">
            {t('campaign.finale.stars', { earned, total })}
          </Text>
          {earned < total && (
            <Text className="mt-1 text-center text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {t('campaign.finale.crownHint')}
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(700).duration(400)} className="mt-8 w-full">
          <Button label={t('campaign.finale.close')} glyph="🎉" variant="hero" onPress={onClose} testID="campaign-finale-close" />
        </Animated.View>
      </View>
    </Modal>
  );
}
