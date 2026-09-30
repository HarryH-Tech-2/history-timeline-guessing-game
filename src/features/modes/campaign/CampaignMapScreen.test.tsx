import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';

import { Dimensions, ScrollView } from 'react-native';

import { useSaves } from '@/features/save';

import type { CampaignProgress } from '../persistence';
import { allStages, allStagesIncludingRoutes, CAMPAIGN, worldStages } from './campaignMap';
import { eraTrailLayout } from './map/trailLayout';

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockSearch: { focus?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockSearch,
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
    mockSetParams.mockClear();
    mockSearch = {};
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
    await seed(cleared([ancient.stages[0]!.id]));
    render(<CampaignMapScreen />);
    // One cleared stage lights the one segment leaving it, five dots.
    await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(5));
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

  it('keeps a legacy player\'s seal and full bar when they never played a route', async () => {
    const main = ancient.stages.map((s) => s.id);
    await seed(cleared(main, 3));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('era-complete')).toBeOnTheScreen());
    expect(screen.queryByTestId('era-mastered')).toBeNull();
    expect(screen.getByTestId(`era-progress-${ancient.id}`)).toHaveStyle({ width: '100%' });
    expect(screen.getByText(`${main.length}/${main.length}`)).toBeOnTheScreen();
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
  it('forks the trail after the fork stage into two bannered, playable routes', async () => {
    const [routeA, routeB] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id]));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId(`route-${routeA!.id}`)).toBeOnTheScreen());
    expect(screen.getByTestId(`route-${routeB!.id}`)).toBeOnTheScreen();
    expect(screen.getByText(`${routeA!.icon} ${routeA!.name}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`route-stars-${routeA!.id}`)).toHaveTextContent('★ 0/9');

    const a1 = screen.getByTestId(`stage-${routeA!.stages[0]!.id}`);
    const b1 = screen.getByTestId(`stage-${routeB!.stages[0]!.id}`);
    expect(within(a1).getByTestId('stage-face-frontier')).toBeOnTheScreen();
    expect(within(b1).getByTestId('stage-face-open')).toBeOnTheScreen();
    expect(within(a1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(within(b1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(screen.getAllByTestId('start-bubble')).toHaveLength(1);
    expect(b1).toHaveProp('accessibilityLabel', `${routeB!.name}, Stage 1`);
    // The rejoin stage waits for a whole route.
    expect(
      within(screen.getByTestId(`stage-${ancient.stages[2]!.id}`)).getByTestId('stage-face-locked'),
    ).toBeOnTheScreen();
    // s1→s2 plus both connectors out of the fork: three segments of five dots.
    expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(15);

    fireEvent.press(b1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/campaign/[world]/[stage]',
      params: { world: ancient.id, stage: routeB!.stages[0]!.id },
    });
  });

  it('reopens the main path after one whole route and leaves the other open', async () => {
    const [routeA, routeB] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id, ...routeA!.stages.map((s) => s.id)]));
    render(<CampaignMapScreen />);
    const rejoin = await screen.findByTestId(`stage-${ancient.stages[2]!.id}`);
    await waitFor(() => expect(within(rejoin).getByTestId('stage-face-frontier')).toBeOnTheScreen());
    expect(
      within(screen.getByTestId(`stage-${routeB!.stages[0]!.id}`)).getByTestId('stage-face-open'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(`route-stars-${routeA!.id}`)).toHaveTextContent('★ 3/9');
  });

  it('sends a free player tapping a Middle Ages route stage to the paywall', async () => {
    const [crusades] = medieval.routes;
    await seed(cleared(ancientAll));
    render(<CampaignMapScreen />);
    const node = await screen.findByTestId(`stage-${crusades!.stages[0]!.id}`);
    expect(node).toHaveProp('accessibilityLabel', `${crusades!.name}, Stage 1, Premium`);
    fireEvent.press(node);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'campaign' } });
  });
  describe('opening scroll', () => {
    const ERA_TOP = 40;
    const TRAIL_TOP_IN_ERA = 200;
    /** Where the map scrolls to put `stageId` (an Ancient stage) a third of the way down. */
    function offsetOf(stageId: string): number {
      const { width, height } = Dimensions.get('window');
      const start = allStages().findIndex((s) => s.id === ancient.stages[0]!.id);
      const node = eraTrailLayout(ancient, start, width).nodes.find((n) => n.stage.id === stageId)!;
      return Math.max(0, ERA_TOP + TRAIL_TOP_IN_ERA + node.y - height / 3);
    }
    async function layOutAncient() {
      const trail = await screen.findByTestId(`era-trail-${ancient.id}`);
      fireEvent(trail, 'layout', { nativeEvent: { layout: { y: TRAIL_TOP_IN_ERA } } });
      fireEvent(screen.getByTestId(`era-section-${ancient.id}`), 'layout', {
        nativeEvent: { layout: { y: ERA_TOP } },
      });
    }
    const atFork = () => cleared([ancient.stages[0]!.id, ancient.stages[1]!.id]);

    it('opens on the frontier stage by default', async () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
      await seed(atFork());
      render(<CampaignMapScreen />);
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(15));
      await layOutAncient();
      expect(scrollTo).toHaveBeenLastCalledWith({
        y: offsetOf(ancient.routes[0]!.stages[0]!.id),
        animated: false,
      });
      expect(mockSetParams).not.toHaveBeenCalled();
      scrollTo.mockRestore();
    });

    it('opens on the focus stage instead when one is asked for, and consumes it', async () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
      mockSearch = { focus: ancient.stages[1]!.id };
      await seed(atFork());
      render(<CampaignMapScreen />);
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(15));
      await layOutAncient();
      expect(scrollTo).toHaveBeenLastCalledWith({
        y: offsetOf(ancient.stages[1]!.id),
        animated: false,
      });
      expect(offsetOf(ancient.stages[1]!.id)).not.toBe(offsetOf(ancient.routes[0]!.stages[0]!.id));
      expect(mockSetParams).toHaveBeenCalledWith({ focus: undefined });
      scrollTo.mockRestore();
    });
  });

  it('swaps the painting once the next era crosses the middle of the screen', async () => {
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId(`era-backdrop-${ancient.id}`)).toBeOnTheScreen());
    const scroll = screen.getByTestId('campaign-scroll');
    const layout = (y: number, height: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 400, height } },
    });
    fireEvent(scroll, 'layout', layout(0, 800));
    fireEvent(screen.getByTestId(`era-section-${ancient.id}`), 'layout', layout(0, 1500));
    fireEvent(screen.getByTestId(`era-section-${medieval.id}`), 'layout', layout(1500, 2000));
    const scrollTo = (y: number) =>
      fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y } } });

    // The Middle Ages section starts 500 px down: below the middle line (400).
    scrollTo(1000);
    expect(screen.queryByTestId(`era-backdrop-${medieval.id}`)).toBeNull();
    // Now 350 px down: past the middle, so its painting takes over...
    scrollTo(1150);
    expect(screen.getByTestId(`era-backdrop-${medieval.id}`)).toBeOnTheScreen();
    // ...while the sticky bar still names the era under it.
    expect(screen.getByTestId('sticky-era-title', HIDDEN)).toHaveTextContent(`ERA I · ${ancient.name}`);
  });
});
