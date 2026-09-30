import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { LanguageSheet } from '@/features/progression/components/LanguageSheet';

import { LanguageProvider, languageStore } from './LanguageProvider';
import { setLanguage, t } from './translate';

function Probe() {
  return <Text testID="probe">{t('tabs.play')}</Text>;
}

function App() {
  return (
    <LanguageProvider>
      <Probe />
      <LanguageSheet visible onClose={() => {}} />
    </LanguageProvider>
  );
}

describe('LanguageProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setLanguage('en');
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    setLanguage('en');
  });

  it('follows the phone by default', async () => {
    render(<App />);
    await act(async () => {});
    expect(screen.getByTestId('probe')).toHaveTextContent('Play');
    expect(screen.getByTestId('language-option-system')).toHaveTextContent(/^Phone language \(English\)/);
    expect(screen.getByTestId('language-option-system')).toBeSelected();
  });

  it('switches the whole tree to the picked language and remembers it', async () => {
    render(<App />);
    await act(async () => {});
    fireEvent.press(screen.getByTestId('language-option-pt-BR'));
    act(() => jest.advanceTimersByTime(300));
    expect(screen.getByTestId('probe')).toHaveTextContent('Jogar');
    expect(screen.getByTestId('language-option-system')).toHaveTextContent('Idioma do celular (English)');
    await waitFor(async () => expect(await languageStore.read()).toBe('pt-BR'));
  });

  it('restores a saved choice on the next launch', async () => {
    await languageStore.write('es-419');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('Jugar'));
    expect(screen.getByTestId('language-option-es-419')).toBeSelected();
  });
});
