import { useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/features/modes/category/CategoryScreen';

export default function Category() {
  const { id, region } = useLocalSearchParams<{ id: string; region?: string }>();
  return <CategoryScreen categoryId={id ?? ''} regionId={region || undefined} />;
}
