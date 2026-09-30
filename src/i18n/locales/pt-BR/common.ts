import type { Translation } from '../../types';

export const common = {
  on: 'Ligado',
  off: 'Desligado',
  cancel: 'Cancelar',
  save: 'Salvar',
  close: 'Fechar',
  continue: 'Continuar',
  back: 'Voltar',
  day: { one: '{count} dia', other: '{count} dias' },
  coins: { one: '{count} moeda', other: '{count} moedas' },
  unlimitedCoins: 'Moedas ilimitadas',
  level: 'Nível {level}',
  bce: 'a.C.',
} satisfies Translation['common'];

export const tabs = {
  play: 'Jogar',
  campaign: 'Campanha',
  museum: 'Museu',
  social: 'Social',
  profile: 'Perfil',
} satisfies Translation['tabs'];

export const store = {
  // Sentences say "na loja {store}", so the name needs no article.
  nameIos: 'App Store',
  nameAndroid: 'Google Play',
  inSubscriptionSettingsIos: 'nas suas assinaturas da App Store (Ajustes → Conta Apple → Assinaturas)',
  inSubscriptionSettingsAndroid: 'nas suas assinaturas do Google Play',
  backupProvidersIos: 'Apple ou Google',
  backupProvidersAndroid: 'Google',
  backupButtonIos: 'Fazer backup do progresso',
  backupButtonAndroid: 'Fazer backup no Google',
} satisfies Translation['store'];
