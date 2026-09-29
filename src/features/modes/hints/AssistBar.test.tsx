import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Question } from '@/domain';
import { INITIAL_PROGRESSION } from '@/domain';
import { ProgressionProvider, progressionStore } from '@/features/progression';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

// eslint-disable-next-line import/first
import { AssistBar } from './AssistBar';
// eslint-disable-next-line import/first
import { multipleChoiceYears } from './choices';

const question = { id: 'q1', year: 1969 } as Question;

function renderBar(props: { onSubmit?: () => void; onChoose?: (year: number) => void } = {}) {
  return render(
    <ProgressionProvider>
      <AssistBar
        question={question}
        onSubmit={props.onSubmit ?? jest.fn()}
        onChoose={props.onChoose ?? jest.fn()}
      />
    </ProgressionProvider>,
  );
}

async function withCoins(coins: number) {
  await progressionStore.write({ ...INITIAL_PROGRESSION, coins });
}

describe('AssistBar', () => {
  afterEach(() => progressionStore.clear());

  it('puts hint, multiple choice and submit in one row', () => {
    renderBar();
    expect(screen.getByTestId('assist-row')).toBeOnTheScreen();
    expect(screen.getByTestId('hint-button')).toBeOnTheScreen();
    expect(screen.getByTestId('choices-button')).toBeOnTheScreen();
    expect(screen.getByTestId('submit-button')).toBeOnTheScreen();
  });

  it('submits the timeline guess from its submit button', () => {
    const onSubmit = jest.fn();
    renderBar({ onSubmit });
    fireEvent.press(screen.getByTestId('submit-button'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('disables both helpers when the player cannot afford them', async () => {
    await withCoins(0);
    renderBar();
    await waitFor(() =>
      expect(screen.getByTestId('hint-button')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ disabled: true }),
      ),
    );
    expect(screen.getByTestId('choices-button')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );
  });

  it('spends 10 coins and shows the century line for a hint', async () => {
    await withCoins(25);
    renderBar();
    await waitFor(() =>
      expect(screen.getByTestId('hint-button')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ disabled: false }),
      ),
    );
    fireEvent.press(screen.getByTestId('hint-button'));
    await screen.findByText('the 1900s');
    await waitFor(async () => expect((await progressionStore.read()).coins).toBe(15));
  });

  it('spends 25 coins and offers four years, one of them right', async () => {
    await withCoins(40);
    const onChoose = jest.fn();
    renderBar({ onChoose });
    await waitFor(() =>
      expect(screen.getByTestId('choices-button')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ disabled: false }),
      ),
    );
    fireEvent.press(screen.getByTestId('choices-button'));
    const years = multipleChoiceYears(question);
    for (const year of years) {
      expect(await screen.findByTestId(`choice-${year}`)).toBeOnTheScreen();
    }
    await waitFor(async () => expect((await progressionStore.read()).coins).toBe(15));

    fireEvent.press(screen.getByTestId('choice-1969'));
    expect(onChoose).toHaveBeenCalledWith(1969);
  });

  it('only takes the first pick', async () => {
    await withCoins(40);
    const onChoose = jest.fn();
    renderBar({ onChoose });
    await waitFor(() =>
      expect(screen.getByTestId('choices-button')).toHaveProp(
        'accessibilityState',
        expect.objectContaining({ disabled: false }),
      ),
    );
    fireEvent.press(screen.getByTestId('choices-button'));
    const [first, second] = multipleChoiceYears(question);
    fireEvent.press(await screen.findByTestId(`choice-${first}`));
    fireEvent.press(screen.getByTestId(`choice-${second}`));
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
