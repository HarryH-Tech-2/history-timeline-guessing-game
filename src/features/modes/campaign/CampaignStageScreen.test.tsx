import { render, screen } from '@testing-library/react-native';

import { CAMPAIGN } from './campaignMap';

const mockParams = { world: '', stage: '' };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

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
});
