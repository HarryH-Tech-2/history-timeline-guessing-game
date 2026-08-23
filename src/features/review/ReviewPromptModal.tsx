import { Image, Linking, Modal, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { Button } from '@/components/ui';

import {
  completeReviewPrompt,
  deferReviewPrompt,
  useReviewPromptVisible,
} from './reviewPrompt';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.harryhh.historydateguesser';

/** Launch the native in-app review sheet, falling back to the store listing. */
async function openReviewFlow(): Promise<void> {
  try {
    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      return;
    }
  } catch {
    // Fall through to the store listing.
  }
  await Linking.openURL(PLAY_STORE_URL).catch(() => undefined);
}

/**
 * A personal, once-in-a-while ask for a store review: the developer's photo
 * and a friendly note, shown after enough rounds that the player clearly
 * likes the game. Mounted once at the app root; visibility is driven by
 * {@link useReviewPromptVisible}.
 */
export function ReviewPromptModal() {
  const visible = useReviewPromptVisible();

  const handleRate = () => {
    void openReviewFlow().finally(() => {
      void completeReviewPrompt();
    });
  };

  const handleLater = () => {
    void deferReviewPrompt();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleLater}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View
          className="w-full max-w-sm items-center gap-4 rounded-3xl border border-hair bg-bg-raised p-6"
          testID="review-prompt"
        >
          <Image
            source={require('../../../assets/review/harry.jpg')}
            accessibilityIgnoresInvertColors
            accessible
            accessibilityLabel="Photo of Harry, the developer"
            className="h-24 w-24 rounded-full bg-bg-overlay"
          />
          <Text className="text-center text-xl font-bold text-ink-primary">
            Enjoying the game?
          </Text>
          <Text className="text-center text-base leading-6 text-ink-secondary">
            Hi, I’m Harry — I build this game by myself in my spare time. If
            you’re having fun with it, a quick review would honestly make my
            day, and it helps other history fans find the game too. Thank you!
          </Text>
          <View className="w-full gap-2 pt-1">
            <Button
              label="Sure, I’ll leave a review"
              onPress={handleRate}
              testID="review-accept"
            />
            <Button
              label="Maybe later"
              variant="ghost"
              onPress={handleLater}
              testID="review-later"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
