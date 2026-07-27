import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Question } from '@/domain';
import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { HintButton } from './HintButton';

const question = { id: 'q1', year: 1969 } as Question;

describe('HintButton', () => {
  afterEach(() => progressionStore.clear());

  it('is disabled when the player cannot afford it', () => {
    render(<HintButton question={question} />);
    const button = screen.getByTestId('hint-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('spends coins and reveals the century when affordable', async () => {
    await progressionStore.write({ ...INITIAL_PROGRESSION, coins: 25 });

    render(
      <ProgressionProvider>
        <HintButton question={question} />
      </ProgressionProvider>,
    );

    const button = await screen.findByTestId('hint-button');
    await waitFor(() => expect(button.props.accessibilityState?.disabled).toBe(false));

    fireEvent.press(button);

    await screen.findByText('the 1900s');
    await waitFor(async () => {
      expect((await progressionStore.read()).coins).toBe(15);
    });
  });
});
