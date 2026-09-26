import { render, screen } from '@testing-library/react-native';

import { FounderNote } from './FounderNote';

describe('FounderNote', () => {
  it('renders the greeting and each body paragraph as separate text blocks', () => {
    render(
      <FounderNote
        paragraphs={['Hi, I’m Harry 👋', 'First body beat.', 'Second body beat.']}
      />,
    );
    expect(screen.getByText('Hi, I’m Harry 👋')).toBeOnTheScreen();
    expect(screen.getByText('First body beat.')).toBeOnTheScreen();
    expect(screen.getByText('Second body beat.')).toBeOnTheScreen();
  });

  it('renders a single paragraph on its own', () => {
    render(<FounderNote paragraphs={['Thanks for the support!']} />);
    expect(screen.getByText('Thanks for the support!')).toBeOnTheScreen();
  });
});
