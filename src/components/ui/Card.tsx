import { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

interface CardProps extends ViewProps {
  children?: ReactNode;
  className?: string;
}

/** A solid raised surface for primary content blocks. */
export function Card({ children, className, ...rest }: CardProps) {
  return (
    <View
      className={cn('border border-hair bg-bg-raised p-5', className)}
      {...rest}
    >
      {children}
    </View>
  );
}
