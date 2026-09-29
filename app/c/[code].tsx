import { useLocalSearchParams } from 'expo-router';

import { ChallengeScreen } from '@/features/social/ChallengeScreen';
import { normaliseCode } from '@/features/social/shareInvite';

/** A head-to-head challenge, opened from an app link (/c/ABC234) or a typed code. */
export default function ChallengeRoute() {
  const { code, via } = useLocalSearchParams<{ code: string; via?: string }>();
  return (
    <ChallengeScreen code={normaliseCode(code ?? '') ?? ''} via={via === 'code' ? 'code' : 'link'} />
  );
}
