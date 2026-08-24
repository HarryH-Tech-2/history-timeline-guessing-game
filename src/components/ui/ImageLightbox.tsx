import { useCallback, useEffect } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

interface ImageLightboxProps {
  visible: boolean;
  source?: ImageSourcePropType;
  /** Caption under the image (e.g. the question title). */
  title?: string;
  onClose: () => void;
}

/**
 * Full-screen image viewer with pinch-to-zoom, drag-to-pan and double-tap
 * zoom. Rendered in a Modal, so it needs its own gesture root on Android.
 */
export function ImageLightbox({ visible, source, title, onClose }: ImageLightboxProps) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height * 0.72);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const reset = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    tx.value = 0;
    ty.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
  }, [savedScale, savedTx, savedTy, scale, tx, ty]);

  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  const clampTranslate = useCallback(
    (value: number, currentScale: number): number => {
      'worklet';
      const max = (size * (currentScale - 1)) / 2;
      return Math.min(max, Math.max(-max, value));
    },
    [size],
  );

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.5, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE);
        tx.value = withSpring(0);
        ty.value = withSpring(0);
        savedScale.value = MIN_SCALE;
      } else {
        savedScale.value = scale.value;
        tx.value = clampTranslate(tx.value, scale.value);
        ty.value = clampTranslate(ty.value, scale.value);
      }
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = clampTranslate(savedTx.value + e.translationX, scale.value);
      ty.value = clampTranslate(savedTy.value + e.translationY, scale.value);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = MIN_SCALE;
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
      }
      savedTx.value = 0;
      savedTy.value = 0;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-black/95">
          <SafeAreaView edges={['top', 'bottom']} className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3">
              <Text numberOfLines={1} className="flex-1 pr-3 text-base font-semibold text-white">
                {title ?? ''}
              </Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close image"
                hitSlop={10}
                testID="lightbox-close"
                className="h-10 w-10 items-center justify-center border border-white/30"
              >
                <Text className="text-lg font-bold text-white">✕</Text>
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center overflow-hidden">
              <GestureDetector gesture={gesture}>
                <Animated.View style={[{ width: size, height: size }, imageStyle]}>
                  {source && (
                    <Image
                      source={source}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                      style={{ width: size, height: size }}
                    />
                  )}
                </Animated.View>
              </GestureDetector>
            </View>

            <Text className="pb-3 text-center text-xs text-white/60">
              Pinch to zoom · double-tap to toggle
            </Text>
          </SafeAreaView>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
