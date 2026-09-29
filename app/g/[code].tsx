import { useLocalSearchParams } from 'expo-router';

import { JoinGroupScreen } from '@/features/social/JoinGroupScreen';

/** A group invite, opened from an app link (/g/ABC234) or a typed code. */
export default function JoinGroupRoute() {
  const { code, via } = useLocalSearchParams<{ code: string; via?: string }>();
  return <JoinGroupScreen code={code ?? ''} via={via === 'code' ? 'code' : 'link'} />;
}
