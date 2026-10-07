import { useLocalSearchParams } from 'expo-router';

import { EventDetailScreen } from '@/features/favourites/EventDetailScreen';

export default function Event() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventDetailScreen questionId={id ?? ''} />;
}
