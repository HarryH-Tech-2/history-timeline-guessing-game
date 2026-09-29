import { renderHook, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';
import { useSaves } from '@/features/save';
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
    expect(screen.getByLabelText(/^Next Daily in \d+(h|m)/)).toBeOnTheScreen();
    expect(screen.getByTestId('daily-done-seal')).toBeOnTheScreen();
    expect(screen.queryByText('Play')).toBeNull();
  });

  it("shows today's score once today is played", async () => {
    const saves = renderHook(useSaves).result.current;
    await saves.daily.write({ date: dateKey(), totalScore: 3200, perfectCount: 1, rounds: [] });
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      streak: { count: 2, lastDate: dateKey(), freezes: 0 },
    });
    render(<DailyHeroCard onPress={() => undefined} />, { wrapper });
    await waitFor(() => expect(screen.getByText(/3,200 pts/)).toBeOnTheScreen());
    await saves.daily.write(null);
  });

  it("ignores a stored result from an earlier day", async () => {
    const saves = renderHook(useSaves).result.current;
    await saves.daily.write({ date: '2020-01-01', totalScore: 999, perfectCount: 0, rounds: [] });
    await progressionStore.write({
      ...INITIAL_PROGRESSION,
      streak: { count: 2, lastDate: dateKey(), freezes: 0 },
    });
    render(<DailyHeroCard onPress={() => undefined} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Daily done')).toBeOnTheScreen());
    expect(screen.queryByText(/999 pts/)).toBeNull();
    await saves.daily.write(null);
  });
});
