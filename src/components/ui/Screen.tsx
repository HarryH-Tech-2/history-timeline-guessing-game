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
    <SafeAreaView edges={edges} className="flex-1 bg-bg-base">
      <View className={cn('flex-1', className)}>{children}</View>
    </SafeAreaView>
  );
}
