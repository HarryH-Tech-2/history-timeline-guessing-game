import { useLocalSearchParams } from 'expo-router';

import { ChallengeScreen } from '@/features/social/ChallengeScreen';
import { challengeVia, normaliseCode } from '@/features/social/shareInvite';

/** A head-to-head challenge, opened from an app link (/c/ABC234), a typed code or the Challenges list. */
export default function ChallengeRoute() {
  const { code, via } = useLocalSearchParams<{ code: string; via?: string }>();
  return (
    <ChallengeScreen code={normaliseCode(code ?? '') ?? ''} via={challengeVia(via)} />
  );
}
