import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Category, Question } from '@/domain';

const mockQuestions: Question[] = [
  {
    id: 'evt-a',
    categoryId: 'events',
    title: 'First Event',
    subtitle: 'The first one',
    year: 1500,
    difficulty: 'easy',
    country: 'Nowhere',
    region: 'Somewhere',
    latitude: 0,
    longitude: 0,
    shortDescription: 'a',
    longDescription: 'The first event happened long ago.',
    tags: [],
    verified: true,
    featured: false,
  },
  {
    id: 'evt-b',
    categoryId: 'events',
    title: 'Second Event',
    subtitle: 'The second one',
    year: 1800,
    difficulty: 'easy',
    country: 'Nowhere',
    region: 'Somewhere',
    latitude: 0,
    longitude: 0,
    shortDescription: 'b',
    longDescription: 'The second event happened later.',
    tags: [],
    verified: true,
    featured: false,
  },
];

const mockCategory: Category = {
  id: 'events',
  name: 'Historic Events',
  icon: 'flag',
  colour: '#5B8CFF',
  description: 'Turning points.',
  difficulty: 'easy',
  active: true,
  premiumOnly: false,
  displayOrder: 0,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/data', () => ({
  getDailyQuestions: () => mockQuestions,
  getQuestionById: (id: string) => mockQuestions.find((q) => q.id === id),
  getCategoryById: () => mockCategory,
}));

// eslint-disable-next-line import/first
import { DailyScreen } from './DailyScreen';

describe('DailyScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('plays a full daily run and locks with a summary', async () => {
    render(<DailyScreen />);

    // First question appears once loading resolves.
    await waitFor(() => expect(screen.getByText('First Event')).toBeOnTheScreen());

    // Answer Q1, advance to Q2.
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => expect(screen.getByTestId('next-button')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('next-button'));

    await waitFor(() => expect(screen.getByText('Second Event')).toBeOnTheScreen());

    // Answer Q2 and finish.
    fireEvent.press(screen.getByTestId('submit-button'));
    await waitFor(() => expect(screen.getByTestId('next-button')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('next-button'));

    // The run is now complete and locked behind the summary.
    await waitFor(() => {
      expect(screen.getByText('Daily complete')).toBeOnTheScreen();
      expect(screen.getByTestId('summary-primary')).toBeOnTheScreen();
    });
  });
});
