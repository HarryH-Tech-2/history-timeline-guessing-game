import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// eslint-disable-next-line import/first
import { RemindersContext, type RemindersContextValue } from './RemindersProvider';
// eslint-disable-next-line import/first
import { ReminderNudge } from './ReminderNudge';

function renderWith(overrides: Partial<RemindersContextValue>) {
  const value: RemindersContextValue = {
    enabled: false,
    asked: false,
    isLoading: false,
    enable: jest.fn(() => Promise.resolve(true)),
    disable: jest.fn(),
    dismissNudge: jest.fn(),
    ...overrides,
  };
  render(
    <RemindersContext.Provider value={value}>
      <ReminderNudge />
    </RemindersContext.Provider>,
  );
  return value;
}

describe('ReminderNudge', () => {
  it('offers a reminder to a player who has not been asked', () => {
    const api = renderWith({});
    fireEvent.press(screen.getByTestId('reminder-nudge-accept'));
    expect(api.enable).toHaveBeenCalledTimes(1);
  });

  it('"Not now" dismisses without asking for permission', () => {
    const api = renderWith({});
    fireEvent.press(screen.getByTestId('reminder-nudge-dismiss'));
    expect(api.dismissNudge).toHaveBeenCalledTimes(1);
    expect(api.enable).not.toHaveBeenCalled();
  });

  it('renders nothing once the question has been answered', () => {
    renderWith({ asked: true });
    expect(screen.queryByTestId('reminder-nudge')).toBeNull();
  });

  it('renders nothing while the saved answer is still loading', () => {
    renderWith({ isLoading: true });
    expect(screen.queryByTestId('reminder-nudge')).toBeNull();
  });
});
