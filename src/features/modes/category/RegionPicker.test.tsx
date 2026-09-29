import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { getRegionalQuestions, REGION_RUN_LENGTH, REGIONS } from '@/data';

import { RegionPicker } from './RegionPicker';

describe('RegionPicker', () => {
  it('lists every region with its question count, and the run length once it is shorter', () => {
    render(<RegionPicker onPick={jest.fn()} onBack={jest.fn()} />);
    for (const region of REGIONS) {
      const row = screen.getByTestId(`region-${region.id}`);
      expect(row).toBeOnTheScreen();
      const count = getRegionalQuestions(region.id).length;
      const label =
        count > REGION_RUN_LENGTH
          ? `${count} questions · ${REGION_RUN_LENGTH} per run`
          : `${count} questions`;
      expect(within(row).getByText(label)).toBeOnTheScreen();
    }
  });

  it('reports the chosen region', () => {
    const onPick = jest.fn();
    render(<RegionPicker onPick={onPick} onBack={jest.fn()} />);
    fireEvent.press(screen.getByTestId('region-asia'));
    expect(onPick).toHaveBeenCalledWith('asia');
  });
});
