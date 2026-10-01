import {
  act,
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
import { SEQUENCE_DELAY_MS } from './map/constants';
import { eraTrailLayout } from './map/trailLayout';

const mockPush = jest.fn();
const mockSetParams = jest.fn();
let mockSearch: { focus?: string } = {};
/** The latest focus callback and its cleanup, so a test can blur and refocus the tab. */
let mockFocus: { callback?: () => void | (() => void); cleanup?: void | (() => void) } = {};
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
    mockFocus.callback = callback;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('react').useEffect(() => {
      mockFocus.cleanup = callback();
      return () => mockFocus.cleanup?.();
    }, []);
  },
}));

let mockPremium = false;
jest.mock('@/features/premium', () => ({
  usePremium: () => ({ isPremium: mockPremium, isLoading: false, trialDays: {} }),
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

/**
 * Lit dots on the Ancient trail once `stageIds` are cleared: the road out of
 * the era banner (lit from the start) plus the connectors leaving those stages.
 */
function litDots(stageIds: readonly string[]): number {
  const start = allStages().findIndex((s) => s.id === ancient.stages[0]!.id);
  return eraTrailLayout(ancient, start, Dimensions.get('window').width)
    .segments.filter((s) => s.kind === 'lead' || (s.kind === 'stage' && stageIds.includes(s.fromId)))
    .reduce((n, s) => n + s.dots.length, 0);
}
/** The full map (roads, trophies, sparks) takes a moment to settle under Jest
 * — longer since the era banners sit above their trails (z-index), so 4 s was
 * no longer reliably enough when the whole file runs. */
const LIT_WAIT = { timeout: 10_000 };
const LEAD_ONLY = () => litDots([]);
const ONE_SEGMENT = () => litDots([ancient.stages[0]!.id]);
const TO_THE_FORK = () => litDots([ancient.stages[0]!.id, ancient.stages[1]!.id]);

function cleared(stageIds: readonly string[], stars = 1): CampaignProgress {
  return Object.fromEntries(stageIds.map((id) => [id, { stars, bestScore: 100 }]));
}

describe('CampaignMapScreen', () => {
  // Rendering the whole map (every era's road, trophies and buttons) is slow under Jest.
  jest.setTimeout(20_000);
  beforeEach(() => {
    mockPush.mockClear();
    mockSetParams.mockClear();
    mockSearch = {};
    mockFocus = {};
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
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { source: 'campaign', era: medieval.id },
    });
  });

  it('opens the paywall from a locked era banner, not from a free one', async () => {
    await seed(cleared(ancientAll));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getAllByTestId('era-premium').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByTestId(`world-${ancient.id}`));
    expect(mockPush).not.toHaveBeenCalled();

    const banner = screen.getByTestId(`world-${medieval.id}`);
    expect(banner).toHaveProp('accessibilityRole', 'button');
    fireEvent.press(banner);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { source: 'campaign', era: medieval.id },
    });
  });

  it('keeps era banners inert for Premium players', async () => {
    mockPremium = true;
    await seed(cleared(ancientAll));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId('era-complete')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId(`world-${medieval.id}`));
    expect(mockPush).not.toHaveBeenCalled();
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
    // One cleared stage lights the one segment leaving it.
    await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(ONE_SEGMENT()), LIT_WAIT);
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
    // Mastered: gold, still the era icon, wearing a crown instead of a tick.
    expect(within(first).getByTestId('stage-icon-bank')).toBeOnTheScreen();
    expect(within(first).getByTestId('stage-mastered-crown')).toBeOnTheScreen();
    expect(within(first).queryByTestId('stage-check-badge')).toBeNull();
    // The era's trophy is claimed, crowned.
    expect(
      within(screen.getByTestId(`era-reward-${ancient.id}`)).getByTestId('era-reward-face-mastered'),
    ).toBeOnTheScreen();
  });

  it("holds out each era's trophy, counting the stages still to clear", async () => {
    await seed(cleared([ancient.stages[0]!.id]));
    render(<CampaignMapScreen />);
    const trophy = await screen.findByTestId(`era-reward-${ancient.id}`);
    expect(within(trophy).getByTestId('era-reward-face-locked')).toBeOnTheScreen();
    expect(screen.getByTestId(`era-reward-body-${ancient.id}`)).toHaveTextContent(
      `Clear all ${ancient.stages.length} stages to claim it · 1/${ancient.stages.length}`,
    );
    // The last era's trophy is the whole campaign's.
    const last = CAMPAIGN.at(-1)!;
    expect(screen.getByTestId(`era-reward-body-${last.id}`)).toHaveTextContent(
      new RegExp(`0/${CAMPAIGN.length} eras$`),
    );
    expect(screen.queryByTestId('campaign-finale')).toBeNull();
  });

  it('claims the era trophy once the main path is cleared, and lights the road on', async () => {
    await seed(cleared(ancient.stages.map((s) => s.id)));
    render(<CampaignMapScreen />);
    const trophy = await screen.findByTestId(`era-reward-${ancient.id}`);
    await waitFor(() =>
      expect(within(trophy).getByTestId('era-reward-face-won')).toBeOnTheScreen(),
    );
  });

  it('offers Premium, once, when a free player conquers the free era', async () => {
    mockPremium = false;
    const main = ancient.stages.map((s) => s.id);
    const saves = renderHook(useSaves).result.current;
    await saves.campaign.write(cleared(main.slice(0, -1)));
    const { rerender } = render(<CampaignMapScreen />);
    await screen.findByTestId(`era-reward-${ancient.id}`);
    expect(screen.queryByTestId('era-conquered')).toBeNull();

    await act(async () => {
      mockFocus.cleanup?.();
      await saves.campaign.write(cleared(main));
    });
    rerender(<CampaignMapScreen />);
    await act(async () => {
      mockFocus.cleanup = mockFocus.callback?.();
    });
    await waitFor(() => expect(screen.getByTestId('era-conquered')).toBeOnTheScreen(), {
      timeout: 6000,
    });
    expect(screen.getByTestId('era-conquered-body')).toHaveTextContent(/Next up: The Middle Ages/);
    fireEvent.press(screen.getByTestId('era-conquered-unlock'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/paywall', params: { source: 'era_complete' } });
    await waitFor(() => expect(screen.queryByTestId('era-conquered')).toBeNull());
  }, 20000);

  it('throws the campaign finale when the very last stage is cleared', async () => {
    mockPremium = true;
    const main = allStages().map((s) => s.id);
    const saves = renderHook(useSaves).result.current;
    await saves.campaign.write(cleared(main.slice(0, -1)));
    const { rerender } = render(<CampaignMapScreen />);
    await screen.findByTestId(`era-reward-${ancient.id}`);
    expect(screen.queryByTestId('campaign-finale')).toBeNull();

    await act(async () => {
      mockFocus.cleanup?.();
      await saves.campaign.write(cleared(main));
    });
    rerender(<CampaignMapScreen />);
    await act(async () => {
      mockFocus.cleanup = mockFocus.callback?.();
    });
    await waitFor(() => expect(screen.getByTestId('campaign-finale')).toBeOnTheScreen(), {
      timeout: 5000,
    });
    fireEvent.press(screen.getByTestId('campaign-finale-close'));
    await waitFor(() => expect(screen.queryByTestId('campaign-finale')).toBeNull());
  }, 20000);

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
    // Only the road from the opening banner into the first stage glows.
    await waitFor(() => expect(screen.queryAllByTestId('trail-dot-lit')).toHaveLength(LEAD_ONLY()), LIT_WAIT);
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

  it('draws cleared stages ticked, the next one as the frontier and the rest locked', async () => {
    await seed(cleared([ancient.stages[0]!.id], 2));
    render(<CampaignMapScreen />);
    const [s1, s2, s3] = ancient.stages.map((s) => s.id);
    await waitFor(() =>
      expect(
        within(screen.getByTestId(`stage-${s1}`)).getByTestId('stage-face-completed'),
      ).toBeOnTheScreen(),
    );
    // A cleared stage keeps its era icon and wears a tick, not a crown.
    const first = screen.getByTestId(`stage-${s1}`);
    expect(within(first).getByTestId('stage-icon-bank')).toBeOnTheScreen();
    expect(within(first).getByTestId('stage-check-badge')).toBeOnTheScreen();
    expect(within(first).queryByTestId('stage-mastered-crown')).toBeNull();
    expect(
      within(screen.getByTestId(`stage-${s2}`)).getByTestId('stage-face-frontier'),
    ).toBeOnTheScreen();
    const locked = screen.getByTestId(`stage-${s3}`);
    expect(within(locked).getByTestId('stage-face-locked')).toBeOnTheScreen();
    expect(within(locked).getByText('🔒')).toBeOnTheScreen();
    expect(locked).toHaveProp('accessibilityLabel', 'Stage 3, locked');
    // Free player: the premium eras' stages keep their era icon, with a crown badge.
    const premium = screen.getByTestId(`stage-${medieval.stages[1]!.id}`);
    expect(within(premium).getByTestId('stage-face-premium')).toBeOnTheScreen();
    expect(within(premium).getByTestId('stage-crown-badge')).toBeOnTheScreen();
    expect(within(premium).getByTestId('stage-icon-bow-arrow')).toBeOnTheScreen();
  });
  it('forks the trail after the fork stage into two bannered, playable routes', async () => {
    const [routeA, routeB] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id]));
    render(<CampaignMapScreen />);
    await waitFor(() => expect(screen.getByTestId(`route-${routeA!.id}`)).toBeOnTheScreen());
    expect(screen.getByTestId(`route-${routeB!.id}`)).toBeOnTheScreen();
    expect(screen.getByText(routeA!.name)).toBeOnTheScreen();
    expect(screen.getByTestId(`route-stars-${routeA!.id}`)).toHaveTextContent('★ 0/9');

    const a1 = screen.getByTestId(`stage-${routeA!.stages[0]!.id}`);
    const b1 = screen.getByTestId(`stage-${routeB!.stages[0]!.id}`);
    expect(within(a1).getByTestId('stage-face-frontier')).toBeOnTheScreen();
    expect(within(b1).getByTestId('stage-face-open')).toBeOnTheScreen();
    expect(within(a1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(within(b1).getByTestId('frontier-pulse')).toBeOnTheScreen();
    expect(screen.getAllByTestId('start-bubble')).toHaveLength(1);
    // Two openers pulse side by side: Minerva stays out of the way, START stays.
    expect(screen.queryByLabelText('Minerva the owl')).toBeNull();
    expect(b1).toHaveProp('accessibilityLabel', `${routeB!.name}, Stage 1`);
    // The rejoin stage waits for a whole route.
    expect(
      within(screen.getByTestId(`stage-${ancient.stages[2]!.id}`)).getByTestId('stage-face-locked'),
    ).toBeOnTheScreen();
    // s1→s2 plus both connectors out of the fork.
    expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(TO_THE_FORK());

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
    expect(screen.getByLabelText('Minerva the owl')).toBeOnTheScreen();
  });

  it('brings Minerva back once the player has picked a route', async () => {
    const [routeA] = ancient.routes;
    await seed(cleared([ancient.stages[0]!.id, ancient.stages[1]!.id, routeA!.stages[0]!.id]));
    render(<CampaignMapScreen />);
    const a2 = await screen.findByTestId(`stage-${routeA!.stages[1]!.id}`);
    await waitFor(() => expect(within(a2).getByTestId('stage-face-frontier')).toBeOnTheScreen());
    expect(screen.getByLabelText('Minerva the owl')).toBeOnTheScreen();
  });

  it('sends a free player tapping a Middle Ages route stage to the paywall', async () => {
    const [crusades] = medieval.routes;
    await seed(cleared(ancientAll));
    render(<CampaignMapScreen />);
    const node = await screen.findByTestId(`stage-${crusades!.stages[0]!.id}`);
    expect(node).toHaveProp('accessibilityLabel', `${crusades!.name}, Stage 1, Premium`);
    fireEvent.press(node);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { source: 'campaign', era: medieval.id },
    });
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
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(TO_THE_FORK()), LIT_WAIT);
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
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(TO_THE_FORK()), LIT_WAIT);
      await layOutAncient();
      expect(scrollTo).toHaveBeenLastCalledWith({
        y: offsetOf(ancient.stages[1]!.id),
        animated: false,
      });
      expect(offsetOf(ancient.stages[1]!.id)).not.toBe(offsetOf(ancient.routes[0]!.stages[0]!.id));
      expect(mockSetParams).toHaveBeenCalledWith({ focus: undefined });
      scrollTo.mockRestore();
    });

    it('scrolls to the fork asked for when the tab regains focus after clearing it', async () => {
      const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
      const fork = ancient.stages[1]!.id;
      // Keep the store handle: seeding again would replace the rendered screen.
      const saves = renderHook(useSaves).result.current;
      await saves.campaign.write(cleared([ancient.stages[0]!.id]));
      const { rerender } = render(<CampaignMapScreen />);
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(ONE_SEGMENT()), LIT_WAIT);
      await layOutAncient();
      expect(scrollTo).toHaveBeenLastCalledWith({ y: offsetOf(fork), animated: false });

      // Away playing the fork stage; "Continue your quest" brings the player back to it.
      await act(async () => {
        mockFocus.cleanup?.();
        await saves.campaign.write(atFork());
      });
      let scrolledAt: number | undefined;
      scrollTo.mockClear();
      scrollTo.mockImplementation(() => {
        scrolledAt ??= Date.now();
      });
      mockSearch = { focus: fork };
      rerender(<CampaignMapScreen />);
      const focusedAt = Date.now();
      await act(async () => {
        mockFocus.cleanup = mockFocus.callback?.();
      });
      await waitFor(() => expect(screen.getAllByTestId('trail-dot-lit')).toHaveLength(TO_THE_FORK()), LIT_WAIT);
      await waitFor(
        () => expect(scrollTo).toHaveBeenLastCalledWith({ y: offsetOf(fork), animated: true }),
        { timeout: 5000 },
      );
      // The light-up runs first; only then does the map follow the trail to the fork.
      expect(scrolledAt! - focusedAt).toBeGreaterThanOrEqual(SEQUENCE_DELAY_MS);
      expect(mockSetParams).toHaveBeenLastCalledWith({ focus: undefined });
      scrollTo.mockRestore();
    }, 20000);
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
