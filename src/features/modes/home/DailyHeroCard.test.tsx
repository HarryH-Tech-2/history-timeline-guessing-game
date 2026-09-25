import { render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';
import { dateKey } from '@/utils/date';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// eslint-disable-next-line import/first
import { DailyHeroCard } from './DailyHeroCard';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ProgressionProvider>{children}</ProgressionProvider>
);

describe('DailyHeroCard', () => {
  afterEach(() => progressionStore.clear());

  it('invites play and keeps the daily mode test id when today is unplayed', () => {
    render(<DailyHeroCard onPress={() => undefined} />, { wrapper });
    expect(screen.getByTestId('mode-daily')).toBeOnTheScreen();
    expect(screen.getByText("Today's Daily")).toBeOnTheScreen();
    expect(screen.getByText('Play')).toBeOnTheScreen();
  });

  it('warns when a streak is on the line', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      streak: { count: 3, lastDate: dateKey(yesterday), freezes: 0 },
    });
    render(<DailyHeroCard onPress={() => undefined} />, { wrapper });
    await waitFor(() => expect(screen.getByText(/3-day streak/)).toBeOnTheScreen());
    expect(screen.getByText(/play today to keep it/i)).toBeOnTheScreen();
  });

  it('shows done, the streak and the countdown once today is played', async () => {
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      streak: { count: 4, lastDate: dateKey(), freezes: 0 },
    });
    render(<DailyHeroCard onPress={() => undefined} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Daily done')).toBeOnTheScreen());
    expect(screen.getByText(/4-day streak/)).toBeOnTheScreen();
    expect(screen.getByText(/Next Daily in \d+h/)).toBeOnTheScreen();
    expect(screen.queryByText('Play')).toBeNull();
  });
});
