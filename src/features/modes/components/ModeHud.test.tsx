import { render, screen } from '@testing-library/react-native';
import { cancelAnimation } from 'react-native-reanimated';

import { QuestionSchema, type Question } from '@/domain';
import { evaluateGuess } from '@/features/timeline/math';

import { ModeHud } from './ModeHud';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>(
    'react-native-reanimated',
  );
  return {
    ...actual,
    __esModule: true,
    default: actual.default,
    cancelAnimation: jest.fn(actual.cancelAnimation),
  };
});

const cancelled = cancelAnimation as jest.MockedFunction<typeof cancelAnimation>;

beforeEach(() => {
  cancelled.mockClear();
});

const question: Question = QuestionSchema.parse({
  id: 'q1',
  categoryId: 'events',
  title: 'Moon Landing',
  subtitle: 'Apollo 11',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'Florida',
  latitude: 28.5,
  longitude: -80.6,
  shortDescription: 'a',
  longDescription: 'b',
  tags: [],
  verified: true,
  featured: false,
});

describe('ModeHud progress bar', () => {
  it('exposes position as a progress value with a readable label', () => {
    const results = [evaluateGuess(question, 1969), evaluateGuess(question, 1980)];
    render(<ModeHud progress={{ current: 3, total: 6, results }} />);
    const bar = screen.getByTestId('hud-progress-bar');
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 6, now: 2 });
    expect(screen.getByLabelText('Question 3 of 6')).toBeOnTheScreen();
  });

  it('draws one continuous fill rather than a row of segments', () => {
    render(<ModeHud progress={{ current: 1, total: 3 }} />);
    expect(screen.getByTestId('hud-progress-fill')).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/hud-segment-/)).toHaveLength(0);
    expect(screen.getByTestId('hud-progress-bar')).toHaveAccessibilityValue({ now: 0 });
  });

  it('cancels the fill-head pulse when the bar unmounts so it cannot run forever', () => {
    // Quitting a run mid-question unmounts the bar while its head glow is an
    // endless withRepeat; nothing stops a running animation with its component.
    const { unmount } = render(<ModeHud progress={{ current: 1, total: 3 }} />);
    expect(cancelled).not.toHaveBeenCalled();

    unmount();
    expect(cancelled).toHaveBeenCalled();
  });
});
