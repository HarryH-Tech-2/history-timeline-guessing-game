import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { languageForLocale } from './languages';
import { en } from './locales/en';
import { es419 } from './locales/es-419';
import { ja } from './locales/ja';
import { ptBR } from './locales/pt-BR';
import { formatNumber, setLanguage, t, tRich } from './translate';

afterEach(() => setLanguage('en'));

describe('languageForLocale', () => {
  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['pt_BR', 'pt-BR'],
    ['es-MX', 'es-419'],
    ['ja-JP', 'ja'],
    ['es-ES', 'es-419'],
    ['en-GB', 'en'],
    ['fr-FR', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('%s → %s', (tag, expected) => {
    expect(languageForLocale(tag)).toBe(expected);
  });
});

describe('t', () => {
  it('reads the current language and fills placeholders', () => {
    expect(t('profile.premium.fromPrice', { price: '£2.99' })).toBe('From £2.99');
    setLanguage('pt-BR');
    expect(t('tabs.play')).toBe('Jogar');
    setLanguage('es-419');
    expect(t('tabs.play')).toBe('Jugar');
  });

  it('picks the plural form from count', () => {
    expect(t('common.day', { count: 1 })).toBe('1 day');
    expect(t('common.day', { count: 0 })).toBe('0 days');
    setLanguage('pt-BR');
    expect(t('common.day', { count: 1 })).toBe('1 dia');
    expect(t('common.day', { count: 3 })).toBe('3 dias');
  });

  it('formats numbers for the language', () => {
    expect(t('common.coins', { count: 1234 })).toBe('1,234 coins');
    setLanguage('pt-BR');
    expect(t('common.coins', { count: 1234 })).toBe('1.234 moedas');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('leaves an unfilled placeholder visible rather than blank', () => {
    expect(t('common.level')).toBe('Level {level}');
  });
});

describe('tRich', () => {
  it('drops React nodes into the sentence', () => {
    render(
      <Text testID="line">
        {tRich('profile.nameSheet.body', { name: <Text testID="bold">Owl-42</Text> })}
      </Text>,
    );
    expect(screen.getByTestId('line')).toHaveTextContent(
      'Shown on the leaderboard and your profile. Leave it blank to go by Owl-42.',
    );
    expect(screen.getByTestId('bold')).toHaveTextContent('Owl-42');
  });
});

/** Every leaf string of a dictionary, keyed by its dotted path. */
function leaves(node: unknown, prefix = ''): Record<string, string> {
  if (typeof node === 'string') return { [prefix]: node };
  return Object.entries(node as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => ({ ...acc, ...leaves(value, prefix ? `${prefix}.${key}` : key) }),
    {},
  );
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe.each([
  ['pt-BR', ptBR],
  ['es-419', es419],
  ['ja', ja],
])('%s dictionary', (_name, dictionary) => {
  const source = leaves(en);
  const translated = leaves(dictionary);

  it('has every English key and no others', () => {
    expect(Object.keys(translated).sort()).toEqual(Object.keys(source).sort());
  });

  it('keeps the same placeholders as English in every string', () => {
    const mismatched = Object.keys(source).filter(
      (key) => placeholders(source[key]!).join() !== placeholders(translated[key] ?? '').join(),
    );
    expect(mismatched).toEqual([]);
  });

  it('has no empty strings', () => {
    expect(Object.entries(translated).filter(([, v]) => v.trim() === '')).toEqual([]);
  });
});
