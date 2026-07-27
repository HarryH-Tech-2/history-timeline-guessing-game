import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Category, Question } from '@/domain';

const question: Question = {
  id: 'evt-moon-landing',
  categoryId: 'events',
  title: 'The Moon Landing',
  subtitle: 'Apollo 11 lands the first humans on the Moon',
  year: 1969,
  difficulty: 'easy',
  country: 'United States',
  region: 'Sea of Tranquility',
  latitude: 0.67,
  longitude: 23.47,
  shortDescription: 'First humans on the Moon.',
  longDescription: 'Apollo 11 carried the first humans to the lunar surface in 1969.',
  tags: ['space'],
  verified: true,
  featured: true,
};

const category: Category = {
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

jest.mock('@/data', () => ({
  getRandomQuestion: () => question,
  getCategoryById: () => category,
}));

// eslint-disable-next-line import/first
import { RoundScreen } from './RoundScreen';

describe('RoundScreen', () => {
  it('shows the prompt and asks the player to place a guess', () => {
    render(<RoundScreen />);
    expect(screen.getByText('The Moon Landing')).toBeOnTheScreen();
    expect(screen.getByTestId('submit-button')).toBeOnTheScreen();
  });

  it('reveals the correct year and explanation after submitting', async () => {
    render(<RoundScreen />);

    fireEvent.press(screen.getByTestId('submit-button'));

    await waitFor(() => {
      // The correct year is revealed (in the sheet and on the timeline marker)...
      expect(screen.getAllByText('1969').length).toBeGreaterThan(0);
      // ...along with the teaching moment...
      expect(screen.getByText(/Apollo 11 carried the first humans/)).toBeOnTheScreen();
      // ...and the player can advance.
      expect(screen.getByTestId('next-button')).toBeOnTheScreen();
    });
  });
});
