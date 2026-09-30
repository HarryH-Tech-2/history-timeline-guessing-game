import type { Translation } from '../../types';

export const common = {
  on: 'Activado',
  off: 'Desactivado',
  cancel: 'Cancelar',
  save: 'Guardar',
  close: 'Cerrar',
  continue: 'Continuar',
  back: 'Volver',
  day: { one: '{count} día', other: '{count} días' },
  coins: { one: '{count} moneda', other: '{count} monedas' },
  unlimitedCoins: 'Monedas ilimitadas',
  level: 'Nivel {level}',
  bce: 'a. C.',
} satisfies Translation['common'];

export const tabs = {
  play: 'Jugar',
  campaign: 'Campaña',
  museum: 'Museo',
  social: 'Social',
  profile: 'Perfil',
} satisfies Translation['tabs'];

export const store = {
  // Sentences say "en {store}" / "a través de {store}", so no article.
  nameIos: 'App Store',
  nameAndroid: 'Google Play',
  inSubscriptionSettingsIos: 'en tus suscripciones de App Store (Configuración → Cuenta de Apple → Suscripciones)',
  inSubscriptionSettingsAndroid: 'en tus suscripciones de Google Play',
  backupProvidersIos: 'Apple o Google',
  backupProvidersAndroid: 'Google',
  backupButtonIos: 'Respaldar mi progreso',
  backupButtonAndroid: 'Respaldar en Google',
} satisfies Translation['store'];
