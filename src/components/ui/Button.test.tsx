import { render, screen } from '@testing-library/react-native';

import { Button } from './Button';

describe('Button', () => {
  it('renders a second, smaller line when given a sublabel', () => {
    render(<Button label="Get my yearly subscription" sublabel="£14.99 / year" onPress={jest.fn()} />);
    expect(screen.getByText('Get my yearly subscription')).toBeOnTheScreen();
    expect(screen.getByText('£14.99 / year')).toBeOnTheScreen();
    expect(screen.getByRole('button')).toHaveAccessibleName('Get my yearly subscription, £14.99 / year');
  });

  it('renders the hero variant with its glyph, keeping the label as the accessible name', () => {
    render(<Button label="Next" glyph="→" variant="hero" onPress={jest.fn()} testID="hero" />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
    // The glyph is decorative and hidden from assistive tech, so opt in to see it.
    expect(screen.getByText('→', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('keeps the single-line label when there is no sublabel', () => {
    render(<Button label="Done" onPress={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Done');
  });
});
