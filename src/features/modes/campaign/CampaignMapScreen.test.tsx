import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';

import { useSaves } from '@/features/save';

import type { CampaignProgress } from '../persistence';
import { CAMPAIGN } from './campaignMap';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), navigate: jest.fn(), replace: jest.fn() }),
  // Run the focus callback like a mount effect.
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(callback, []);
  },
}));

let mockPremium = false;
jest.mock('@/features/premium', () => ({
  usePremium: () => ({ isPremium: mockPremium, isLoading: false }),
}));

// eslint-disable-next-line import/first
import { CampaignMapScreen } from './CampaignMapScreen';

const ancient = CAMPAIGN[0]!;
const medieval = CAMPAIGN[1]!;

async function seed(progress: CampaignProgress) {
  const saves = renderHook(useSaves).result.current;
  await saves.campaign.write(progress);
}

function cleared(stageIds: readonly string[], stars = 1): CampaignProgress {
  return Object.fromEntries(stageIds.map((id) => [id, { stars, bestScore: 100 }]));
}

describe('CampaignMapScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockPremium = false;
  });
  afterEach(() => seed({}));

  it('crowns the Middle Ages onward for free players and routes them to the paywall', async () => {
    await seed(cleared(ancient.stages.map((s) => s.id)));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getAllByTestId('era-premium').length).toBeGreaterThan(0));
    expect(screen.getAllByTestId('era-premium')).toHaveLength(CAMPAIGN.length - 1);

    const first = screen.getByTestId(`stage-${medieval.stages[0]!.id}`);
    expect(first).toHaveProp('accessibilityLabel', 'Stage 1, Premium');
    fireEvent.press(first);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'campaign' } });
  });

  it('lets Premium players straight into the Middle Ages', async () => {
    mockPremium = true;
    await seed(cleared(ancient.stages.map((s) => s.id)));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('era-complete')).toBeOnTheScreen());
    expect(screen.queryByTestId('era-premium')).toBeNull();

    fireEvent.press(screen.getByTestId(`stage-${medieval.stages[0]!.id}`));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/campaign/[world]/[stage]',
      params: { world: medieval.id, stage: medieval.stages[0]!.id },
    });
  });

  it('lights the trail behind cleared stages only', async () => {
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id]));
    render(<CampaignMapScreen />);
    // Two cleared stages light the two segments leaving them, five dots each.
    await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(10));
  });

  it('marks a fully three-starred era as mastered and fills the journey bar', async () => {
    await seed(cleared(ancient.stages.map((s) => s.id), 3));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('era-mastered')).toBeOnTheScreen());
    const total = CAMPAIGN.reduce((n, w) => n + w.stages.length, 0);
    expect(screen.getByTestId('journey-percent')).toHaveTextContent(
      `${Math.round((ancient.stages.length / total) * 100)}%`,
    );
  });

  it('shows no seals and an empty journey on a fresh campaign', async () => {
    mockPremium = true;
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('journey-percent')).toHaveTextContent('0%'));
    expect(screen.queryByTestId('era-complete')).toBeNull();
    expect(screen.queryAllByTestId('trail-dot-lit')).toHaveLength(0);
  });
});
