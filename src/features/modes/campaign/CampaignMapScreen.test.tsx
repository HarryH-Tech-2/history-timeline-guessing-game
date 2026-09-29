import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { useSaves } from '@/features/save';

import type { CampaignProgress } from '../persistence';
import { allStagesIncludingRoutes, CAMPAIGN, worldStages } from './campaignMap';

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
/** The sticky bar hides itself from accessibility while the era's banner shows. */
const HIDDEN = { includeHiddenElements: true };
const medieval = CAMPAIGN[1]!;
const ancientAll = worldStages(ancient).map((s) => s.id);

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
    await seed(cleared(ancientAll));
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
    await seed(cleared(ancientAll));
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

  it('marks a fully three-starred era as mastered and tallies the journey stars', async () => {
    await seed(cleared(ancientAll, 3));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('era-mastered')).toBeOnTheScreen());
    const total = allStagesIncludingRoutes().length;
    expect(screen.getByTestId('journey-stars', HIDDEN)).toHaveTextContent(
      `★ ${ancientAll.length * 3}/${total * 3}`,
    );
    const first = screen.getByTestId(`stage-${ancient.stages[0]!.id}`);
    expect(within(first).getByTestId('stage-face-mastered')).toBeOnTheScreen();
  });

  it('shows no seals and no journey stars on a fresh campaign', async () => {
    mockPremium = true;
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('journey-stars', HIDDEN)).toHaveTextContent(/^★ 0\//));
    expect(screen.queryByTestId('era-complete')).toBeNull();
    expect(screen.queryAllByTestId('trail-dot-lit')).toHaveLength(0);
  });

  it('opens on the first era, its painting behind, and START on the first stage', async () => {
    render(<CampaignMapScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('sticky-era-title', HIDDEN)).toHaveTextContent(
        `ERA I · ${ancient.name}`,
      ),
    );
    // The era's own banner is still on screen, so the sticky bar holds back.
    expect(screen.getByTestId('sticky-era-bar', HIDDEN)).toHaveProp('accessibilityElementsHidden', true);
    expect(screen.getByTestId(`era-backdrop-${ancient.id}`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`era-backdrop-${medieval.id}`)).toBeNull();
    expect(screen.getByTestId('sticky-era-stars', HIDDEN)).toHaveTextContent(
      `★ 0/${ancientAll.length * 3}`,
    );
    const first = screen.getByTestId(`stage-${ancient.stages[0]!.id}`);
    expect(within(first).getByTestId('stage-face-frontier')).toBeOnTheScreen();
    expect(screen.getAllByTestId('start-bubble')).toHaveLength(1);
    expect(screen.getByTestId('start-bubble')).toHaveTextContent('START');
    expect(screen.getByLabelText('Minerva the owl')).toBeOnTheScreen();
  });

  it('draws cleared stages starred, the next one as the frontier and the rest locked', async () => {
    await seed(cleared([ancient.stages[0]!.id], 2));
    render(<CampaignMapScreen />);
    const [s1, s2, s3] = ancient.stages.map((s) => s.id);
    await waitFor(() =>
      expect(
        within(screen.getByTestId(`stage-${s1}`)).getByTestId('stage-face-completed'),
      ).toBeOnTheScreen(),
    );
    expect(within(screen.getByTestId(`stage-${s1}`)).getByText('★')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId(`stage-${s2}`)).getByTestId('stage-face-frontier'),
    ).toBeOnTheScreen();
    const locked = screen.getByTestId(`stage-${s3}`);
    expect(within(locked).getByTestId('stage-face-locked')).toBeOnTheScreen();
    expect(within(locked).getByText('🔒')).toBeOnTheScreen();
    expect(locked).toHaveProp('accessibilityLabel', 'Stage 3, locked');
    // Free player: the premium eras' stages wear crowns.
    const premium = screen.getByTestId(`stage-${medieval.stages[1]!.id}`);
    expect(within(premium).getByTestId('stage-face-premium')).toBeOnTheScreen();
  });
});
