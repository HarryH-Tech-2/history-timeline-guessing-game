import type { Translation } from '../../types';

/** Words used across many screens. */
export const common = {
  on: 'オン',
  off: 'オフ',
  cancel: 'キャンセル',
  save: '保存',
  close: '閉じる',
  continue: '続ける',
  back: '戻る',
  day: { one: '{count}日', other: '{count}日' },
  coins: { one: '{count}コイン', other: '{count}コイン' },
  unlimitedCoins: 'コイン無制限',
  level: 'レベル{level}',
  /** Era prefix: %y is replaced by the number ("紀元前450"). */
  bce: '紀元前%y',
} satisfies Translation['common'];

export const tabs = {
  play: 'プレイ',
  campaign: 'キャンペーン',
  museum: '博物館',
  social: 'ソーシャル',
  profile: 'プロフィール',
} satisfies Translation['tabs'];

export const store = {
  nameIos: 'App Store',
  nameAndroid: 'Google Play',
  inSubscriptionSettingsIos:
    'App Storeのサブスクリプション（設定 → Apple アカウント → サブスクリプション）から',
  inSubscriptionSettingsAndroid: 'Google Playの定期購入から',
  backupProvidersIos: 'Apple または Google',
  backupProvidersAndroid: 'Google',
  backupButtonIos: '進行状況をバックアップ',
  backupButtonAndroid: 'Googleにバックアップ',
} satisfies Translation['store'];
