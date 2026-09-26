import { fireEvent, render, screen } from '@testing-library/react-native';

import { BackButton } from './BackButton';

describe('BackButton', () => {
  it('is a labelled button that fires onPress', () => {
    const onPress = jest.fn();
    render(<BackButton onPress={onPress} testID="back" />);
    const button = screen.getByRole('button', { name: 'Back' });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reads as Close in its close variant, with a custom label if given', () => {
    render(<BackButton onPress={jest.fn()} variant="close" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen();
    render(<BackButton onPress={jest.fn()} label="Exit mode" />);
    expect(screen.getByRole('button', { name: 'Exit mode' })).toBeOnTheScreen();
  });
});
