import { useLocalSearchParams } from 'expo-router';

import { CategoryScreen } from '@/features/modes/category/CategoryScreen';

export default function Category() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CategoryScreen categoryId={id ?? ''} />;
}
