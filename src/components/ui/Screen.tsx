import { type ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/utils/cn';

interface ScreenProps {
  children: ReactNode;
  className?: string;
  edges?: readonly Edge[];
}

/** Full-bleed dark screen container that respects safe-area insets. */
export function Screen({
  children,
  className,
  edges = ['top', 'bottom'],
}: ScreenProps) {
  return (
    // Left/right always honoured: in landscape the display cutout sits on a
    // side edge, and without these the HUD/back controls hide under it.
    <SafeAreaView edges={[...edges, 'left', 'right']} className="flex-1 bg-bg-base">
      <View className={cn('flex-1', className)}>{children}</View>
    </SafeAreaView>
  );
}
