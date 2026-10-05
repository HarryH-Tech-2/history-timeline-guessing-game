import { act, render, screen } from '@testing-library/react-native';

jest.mock('@/services/analytics', () => ({ track: jest.fn() }));
jest.mock('@/features/reminders/scheduler', () => ({ refreshTrialReminder: jest.fn(async () => {}) }));
const mockPremium = { isPremium: true };
jest.mock('./PremiumProvider', () => ({ usePremium: () => mockPremium }));

// eslint-disable-next-line import/first
import { refreshTrialReminder } from '@/features/reminders/scheduler';
// eslint-disable-next-line import/first
import { recordTrialRound, startTrialRecap, trialPhase, trialRecapStore } from './trialRecap';
// eslint-disable-next-line import/first
import { TrialRecapCard } from './TrialRecapCard';

const DAY = 24 * 60 * 60 * 1000;

async function renderCard() {
  render(<TrialRecapCard />);
  await act(async () => {});
}

describe('trial recap', () => {
  beforeEach(async () => {
    await trialRecapStore.clear();
    mockPremium.isPremium = true;
    jest.mocked(refreshTrialReminder).mockClear();
  });

  it('runs quietly, then comes on two days before the first charge', () => {
    const state = { startedAt: 0, trialDays: 7, rounds: 0, heartsSaved: 0 };
    expect(trialPhase({ rounds: 0, heartsSaved: 0 }, DAY)).toEqual({ kind: 'none' });
    expect(trialPhase(state, DAY)).toEqual({ kind: 'running', recapAt: 5 * DAY, daysLeftAtRecap: 2 });
    expect(trialPhase(state, 5 * DAY)).toEqual({ kind: 'ending', daysLeft: 2 });
    expect(trialPhase(state, 6.5 * DAY)).toEqual({ kind: 'ending', daysLeft: 1 });
    expect(trialPhase(state, 7 * DAY)).toEqual({ kind: 'none' });
  });

  it('counts rounds and saved hearts only while a trial is running', async () => {
    await recordTrialRound(true);
    expect(await trialRecapStore.read()).toEqual({ rounds: 0, heartsSaved: 0 });
    await startTrialRecap(7);
    await recordTrialRound(true);
    await recordTrialRound(false);
    expect(await trialRecapStore.read()).toMatchObject({ rounds: 2, heartsSaved: 1 });
    await startTrialRecap(7, Date.now() - 8 * DAY);
    await recordTrialRound(true);
    expect(await trialRecapStore.read()).toMatchObject({ rounds: 0, heartsSaved: 0 });
  });

  it('stays off the home screen early in the trial, but refreshes the reminder', async () => {
    await trialRecapStore.write({ startedAt: Date.now() - DAY, trialDays: 7, rounds: 12, heartsSaved: 3 });
    await renderCard();
    expect(screen.queryByTestId('trial-recap-card')).toBeNull();
    expect(refreshTrialReminder).toHaveBeenCalledWith(
      expect.objectContaining({ daysLeft: 2, rounds: 12 }),
    );
  });

  it('shows what the player did with the trial in its last days', async () => {
    await trialRecapStore.write({ startedAt: Date.now() - 5.5 * DAY, trialDays: 7, rounds: 42, heartsSaved: 9 });
    await renderCard();
    const card = screen.getByTestId('trial-recap-card');
    expect(card).toHaveTextContent(/Your free trial ends in 2 days/);
    expect(screen.getByTestId('trial-recap-stats')).toHaveTextContent(
      'So far with Premium: 42 rounds played · 9 hearts saved',
    );
    expect(refreshTrialReminder).not.toHaveBeenCalled();
  });

  it('never shows once Premium has lapsed', async () => {
    await trialRecapStore.write({ startedAt: Date.now() - 6 * DAY, trialDays: 7, rounds: 42, heartsSaved: 9 });
    mockPremium.isPremium = false;
    await renderCard();
    expect(screen.queryByTestId('trial-recap-card')).toBeNull();
  });
});
