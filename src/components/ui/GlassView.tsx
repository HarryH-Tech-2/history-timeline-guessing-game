import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

interface GlassViewProps extends ViewProps {
  children?: ReactNode;
  className?: string;
}

/**
 * A frosted "glass" surface: a translucent fill with a hairline border. Kept
 * dependency-free (no native blur) so it renders identically on both platforms
 * and in Expo Go.
 */
export function GlassView({ children, className, ...rest }: GlassViewProps) {
  return (
    <View
      className={cn(
        'rounded-2xl border border-hair bg-white/5',
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
