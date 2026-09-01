import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PremiumProvider, usePremium } from './PremiumProvider';
import { premiumStore } from './entitlement';

const mockAuth = { uid: null as string | null };
jest.mock('@/services/firebase/auth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('./billing', () => ({
  billing: {
    available: true,
    purchase: jest.fn(async () => 'cancelled'),
    restore: jest.fn(async () => false),
    checkActive: jest.fn(async () => false),
    onChange: jest.fn(() => () => undefined),
    identify: jest.fn(async () => undefined),
    localizedPrices: jest.fn(async () => ({})),
  },
  devBilling: { available: true },
}));
jest.mock('@/features/review', () => ({
  requestReviewAfterFirstPurchase: jest.fn(async () => undefined),
}));
const mockRequestReview = jest.requireMock('@/features/review')
  .requestReviewAfterFirstPurchase as jest.Mock;

const mockBilling = jest.requireMock('./billing').billing as {
  checkActive: jest.Mock;
  identify: jest.Mock;
  purchase: jest.Mock;
  restore: jest.Mock;
};

function Probe() {
  const { isPremium, isLoading } = usePremium();
  return <Text>{isLoading ? 'loading' : isPremium ? 'premium' : 'free'}</Text>;
}

describe('PremiumProvider store identity', () => {
  beforeEach(() => {
    mockAuth.uid = null;
    mockBilling.checkActive.mockReset().mockResolvedValue(false);
    mockBilling.identify.mockClear();
  });
  afterEach(() => premiumStore.clear());

  it('identifies the signed-in user to the store and re-checks the entitlement', async () => {
    mockAuth.uid = 'guest-uid';
    const view = render(
      <PremiumProvider>
        <Probe />
      </PremiumProvider>,
    );
    await screen.findByText('free');
    await waitFor(() => expect(mockBilling.identify).toHaveBeenCalledWith('guest-uid'));

    // The player signs into an account that has been granted Premium.
    mockBilling.checkActive.mockResolvedValue(true);
    mockAuth.uid = 'reviewer-uid';
    await act(async () => {
      view.rerender(
        <PremiumProvider>
          <Probe />
        </PremiumProvider>,
      );
    });

    await waitFor(() => expect(mockBilling.identify).toHaveBeenLastCalledWith('reviewer-uid'));
    await screen.findByText('premium');
  });
});

describe('PremiumProvider review ask', () => {
  beforeEach(() => {
    mockAuth.uid = null;
    mockBilling.checkActive.mockReset().mockResolvedValue(false);
    mockBilling.purchase.mockReset().mockResolvedValue('purchased');
    mockBilling.restore.mockReset().mockResolvedValue(true);
    mockRequestReview.mockClear();
  });
  afterEach(() => premiumStore.clear());

  function Actions() {
    const { purchase, restore } = usePremium();
    return (
      <>
        <Text onPress={() => void purchase('monthly')}>buy</Text>
        <Text onPress={() => void restore()}>restore</Text>
      </>
    );
  }

  it('asks for a store review once a purchase succeeds', async () => {
    render(
      <PremiumProvider>
        <Probe />
        <Actions />
      </PremiumProvider>,
    );
    await screen.findByText('free');

    await act(async () => {
      fireEvent.press(screen.getByText('buy'));
    });

    await screen.findByText('premium');
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it('does not ask after a cancelled purchase or a restore', async () => {
    mockBilling.purchase.mockResolvedValue('cancelled');
    render(
      <PremiumProvider>
        <Probe />
        <Actions />
      </PremiumProvider>,
    );
    await screen.findByText('free');

    await act(async () => {
      fireEvent.press(screen.getByText('buy'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('restore'));
    });

    await screen.findByText('premium');
    expect(mockRequestReview).not.toHaveBeenCalled();
  });
});
