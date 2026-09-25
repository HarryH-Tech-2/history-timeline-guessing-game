import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { getRegionalQuestions, REGIONS } from '@/data';

import { RegionPicker } from './RegionPicker';

describe('RegionPicker', () => {
  it('lists every region with its question count', () => {
    render(<RegionPicker onPick={jest.fn()} onBack={jest.fn()} />);
    for (const region of REGIONS) {
      const row = screen.getByTestId(`region-${region.id}`);
      expect(row).toBeOnTheScreen();
      expect(
        within(row).getByText(`${getRegionalQuestions(region.id).length} questions`),
      ).toBeOnTheScreen();
    }
  });

  it('reports the chosen region', () => {
    const onPick = jest.fn();
    render(<RegionPicker onPick={onPick} onBack={jest.fn()} />);
    fireEvent.press(screen.getByTestId('region-asia'));
    expect(onPick).toHaveBeenCalledWith('asia');
  });
});
