import { fireEvent, render, screen } from '@testing-library/react-native';

import { CAMPAIGN } from './campaignMap';

const mockParams = { world: '', stage: '' };
const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

// Every stage that gets past the guards finishes at once: these tests are
// about the summary's buttons, not the rounds.
jest.mock('./useCampaignSession', () => ({
  useCampaignSession: () => ({
    session: { status: 'finished', results: [], totalScore: 0 },
    totalQuestions: 5,
    earnedStars: 1,
  }),
}));
jest.mock('@/features/round', () => ({ RoundView: () => null, useRoundRewards: () => undefined }));
jest.mock('@/features/hearts', () => ({
  HeartsChip: () => null,
  OutOfHeartsSheet: () => null,
  useHearts: () => ({ empty: false }),
}));
jest.mock('@/features/account/SignInNudge', () => ({ SignInNudge: () => null }));
/** The summary, reduced to its buttons. */
jest.mock('../components/RunSummary', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native') as typeof import('react-native');
  const button = (id: string, label: string | undefined, onPress: (() => void) | undefined) =>
    label === undefined || onPress === undefined ? null : (
      <Pressable testID={id} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  return {
    roundDetail: () => '',
    RunSummary: (p: {
      primaryLabel: string;
      onPrimary: () => void;
      secondaryLabel?: string;
      onSecondary?: () => void;
      tertiaryLabel?: string;
      onTertiary?: () => void;
    }) => (
      <>
        {button('summary-primary', p.primaryLabel, p.onPrimary)}
        {button('summary-secondary', p.secondaryLabel, p.onSecondary)}
        {button('summary-tertiary', p.tertiaryLabel, p.onTertiary)}
      </>
    ),
  };
});

let mockPremium = false;
jest.mock('@/features/premium', () => ({
  usePremium: () => ({ isPremium: mockPremium, isLoading: false }),
}));

// eslint-disable-next-line import/first
import { CampaignStageScreen } from './CampaignStageScreen';

const medieval = CAMPAIGN[1]!;

describe('CampaignStageScreen premium guard', () => {
  beforeEach(() => {
    mockPremium = false;
    mockParams.world = medieval.id;
    mockParams.stage = medieval.stages[0]!.id;
  });

  it('never starts a Premium stage for a free player', () => {
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('stage-premium-locked')).toBeOnTheScreen();
    expect(screen.getByText(/is part of Premium/)).toBeOnTheScreen();
    expect(screen.queryByTestId('submit-button')).toBeNull();
  });
  it('guards a deep link into a premium route stage too', () => {
    mockParams.stage = medieval.routes[0]!.stages[0]!.id;
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('stage-premium-locked')).toBeOnTheScreen();
    expect(screen.queryByTestId('submit-button')).toBeNull();
  });

  it('says an unknown route stage could not be found', () => {
    mockParams.stage = `${medieval.id}-crusades-castles-s9`;
    render(<CampaignStageScreen />);
    expect(screen.getByText('This stage could not be found.')).toBeOnTheScreen();
  });
});

describe('CampaignStageScreen quest buttons', () => {
  const ancient = CAMPAIGN[0]!;
  beforeEach(() => {
    mockPremium = false;
    Object.values(mockRouter).forEach((fn) => fn.mockClear());
  });

  it('keeps Back to map after the fork stage and continues to the map focused on the fork', () => {
    const fork = ancient.stages[1]!;
    expect(ancient.routes[0]!.afterStageId).toBe(fork.id);
    mockParams.world = ancient.id;
    mockParams.stage = fork.id;
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('summary-primary')).toHaveTextContent('Continue your quest →');
    expect(screen.getByTestId('summary-secondary')).toHaveTextContent('Back to map');
    expect(screen.getByTestId('summary-tertiary')).toHaveTextContent('Replay stage');

    fireEvent.press(screen.getByTestId('summary-primary'));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith({
      pathname: '/campaign',
      params: { focus: fork.id },
    });
    expect(mockRouter.back).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('summary-secondary'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('carries straight on to the next stage mid-campaign', () => {
    mockParams.world = ancient.id;
    mockParams.stage = ancient.stages[0]!.id;
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('summary-secondary')).toHaveTextContent('Back to map');
    fireEvent.press(screen.getByTestId('summary-primary'));
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/campaign/[world]/[stage]',
      params: { world: ancient.id, stage: ancient.stages[1]!.id },
    });
  });

  it('offers only the map and a replay after the very last stage', () => {
    mockPremium = true;
    const last = CAMPAIGN.at(-1)!;
    mockParams.world = last.id;
    mockParams.stage = last.stages.at(-1)!.id;
    render(<CampaignStageScreen />);
    expect(screen.getByTestId('summary-primary')).toHaveTextContent('Back to map');
    expect(screen.getByTestId('summary-secondary')).toHaveTextContent('Replay');
    expect(screen.queryByTestId('summary-tertiary')).toBeNull();
    fireEvent.press(screen.getByTestId('summary-primary'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });
});
