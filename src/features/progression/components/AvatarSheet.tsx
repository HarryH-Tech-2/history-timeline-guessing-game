import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CAMPAIGN, eraName, eraStatus } from '@/features/modes/campaign/campaignMap';
import type { CampaignProgress } from '@/features/modes/persistence';
import { usePremium } from '@/features/premium/PremiumProvider';
import { paywallHref } from '@/features/premium/paywallSource';
import { useSaves } from '@/features/save';
import { t } from '@/i18n';

import { earnedAchievementIds } from '../achievements';
import {
  AVATARS,
  avatarName,
  avatarUnlockHint,
  isAvatarUnlocked,
  resolveAvatar,
  type Avatar,
  type AvatarProgress,
} from '../avatars';
import { useProgression } from '../ProgressionProvider';

function eraLabel(eraId: string): string {
  const world = CAMPAIGN.find((w) => w.id === eraId);
  return world ? eraName(world) : eraId;
}

/**
 * Bottom sheet for picking the profile avatar. Unlocked ones are picked with a
 * tap; a locked one explains how to earn it, and a Premium one opens the paywall.
 */
export function AvatarSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { state, setAvatar } = useProgression();
  const { isPremium } = usePremium();
  const { isReady, campaign } = useSaves();
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>({});
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !isReady) return;
    let active = true;
    void campaign.read().then((p) => {
      if (active) setCampaignProgress(p);
    });
    return () => {
      active = false;
    };
  }, [visible, isReady, campaign]);

  const progress = useMemo<AvatarProgress>(
    () => ({
      isPremium,
      achievements: new Set(earnedAchievementIds(state)),
      completedEras: new Set(
        CAMPAIGN.filter((w) => eraStatus(w, campaignProgress).complete).map((w) => w.id),
      ),
    }),
    [isPremium, state, campaignProgress],
  );
  const current = resolveAvatar(state.avatar, isPremium);

  const close = () => {
    setHint(null);
    onClose();
  };

  const choose = (avatar: Avatar) => {
    if (isAvatarUnlocked(avatar, progress)) {
      setAvatar(avatar.id);
      close();
    } else if (avatar.unlock.kind === 'premium') {
      close();
      router.push(paywallHref('profile'));
    } else {
      setHint(`${avatar.emoji} ${avatarName(avatar)}: ${avatarUnlockHint(avatar, eraLabel)}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        className="flex-1 justify-end bg-black/50"
        onPress={close}
        accessibilityLabel={t('common.close')}
        testID="avatar-backdrop"
      >
        <Pressable className="gap-3 border-t border-hair bg-bg-overlay p-6 pb-10" onPress={() => {}}>
          <View>
            <Text className="text-xl font-extrabold text-ink-primary">{t('profile.avatar.title')}</Text>
            <Text className="mt-1 text-sm text-ink-secondary">{t('profile.avatar.body')}</Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {AVATARS.map((avatar) => {
              const unlocked = isAvatarUnlocked(avatar, progress);
              const selected = avatar.id === current.id;
              const name = avatarName(avatar);
              return (
                <Pressable
                  key={avatar.id}
                  onPress={() => choose(avatar)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !unlocked }}
                  accessibilityLabel={
                    unlocked
                      ? name
                      : t('profile.avatar.locked', { name, hint: avatarUnlockHint(avatar, eraLabel) })
                  }
                  testID={`avatar-option-${avatar.id}`}
                  className={`w-[23%] items-center gap-1 rounded-xl border-2 bg-bg-raised py-2 ${
                    selected ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <View>
                    <Text className="text-3xl" style={{ opacity: unlocked ? 1 : 0.35 }}>
                      {avatar.emoji}
                    </Text>
                    {!unlocked && (
                      <Text className="absolute -bottom-1 -right-2 text-sm">
                        {avatar.unlock.kind === 'premium' ? '👑' : '🔒'}
                      </Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className={`px-1 text-[11px] font-semibold ${unlocked ? 'text-ink-primary' : 'text-ink-muted'}`}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {hint !== null && (
            <Text className="text-center text-sm font-semibold text-accent" testID="avatar-hint">
              {hint}
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
