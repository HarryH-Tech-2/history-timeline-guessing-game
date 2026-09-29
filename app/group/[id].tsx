import { useLocalSearchParams } from 'expo-router';

import { GroupScreen } from '@/features/social/GroupScreen';

export default function GroupRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupScreen groupId={id ?? ''} />;
}
