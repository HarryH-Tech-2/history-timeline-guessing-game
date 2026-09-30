import type { Translation } from '../../types';

export const account = {
  somethingWrong: '問題が発生しました。',
  signIn: {
    title: 'ログイン',
    offline:
      'アカウント機能には接続が必要で、このビルドでは利用できません。進行状況はこの端末に保存されています。',
    backupTitle: '進行状況をバックアップ',
    backupBody:
      '任意です。{providers} でバックアップすると、新しいスマホでも進行状況を引き継げます。これまでに獲得したものはすべてそのまま残ります。',
    switchTitle: 'アカウントを切り替え',
    switchBody: '別のアカウントでログインします。',
    benefits: {
      devices: '進行状況、博物館、キャンペーンをどの端末にも引き継げます。',
      name: 'グローバルランキングでの名前をずっと使えます。',
      oneTap: 'ワンタップで完了。パスワードは不要です。',
    },
    google: 'Google で続ける',
    working: '処理中…',
    purchasesNote:
      'プレミアムの購入はログインではなく、{store} のアカウントに紐づいています。アカウントがなくてもプレミアムの購入と復元ができます。',
  },
  delete: {
    title: 'アカウントを削除',
    guest:
      'ゲストとしてプレイしているため、削除するアカウントはありません。アプリをアンインストールすると、この端末の進行状況は削除されます。',
    offline: 'このビルドではアカウント機能を利用できません。',
    signedInAs: '{name} としてログイン中',
    willDelete: '次のデータが完全に削除されます',
    items: {
      signIn: 'ログインの連携。このアカウントには二度とログインできなくなります。',
      cloud: 'クラウドのセーブデータ: XP、レベル、コイン、ハート、博物館、キャンペーンの進行状況、ベストスコア。',
      leaderboard: 'グローバルランキングのあなたの記録。',
      device: 'この端末に保存されている同じ進行状況のコピー。',
    },
    purchasesNote:
      '購入は {store} で管理されているため、影響はありません。有効なプレミアムの定期購入は、{where}別途解約する必要があります。',
    passwordPlaceholder: 'パスワードを確認',
    showPassword: 'パスワードを表示',
    hidePassword: 'パスワードを隠す',
    show: '表示',
    hide: '隠す',
    enterPassword: '確認のためパスワードを入力してください。',
    submit: 'アカウントを削除する',
    deleting: '削除中…',
    confirmTitle: 'アカウントを削除しますか?',
    confirmBody: 'アカウントとそのすべての進行状況が完全に削除されます。この操作は取り消せません。',
    confirmButton: '削除',
  },
  errors: {
    offline: 'アカウント機能には接続が必要で、このビルドでは利用できません。',
    alreadyLinked: 'そのアカウントはすでに別のプレイヤーに連携されています。',
    wrongPassword: 'メールアドレスまたはパスワードが正しくありません。',
    recentLogin: 'アカウントを削除する前に、もう一度ログインしてください。',
    tooMany: '試行回数が多すぎます。少し待ってからもう一度お試しください。',
    network: '接続がありません。ネットワークを確認してもう一度お試しください。',
    failed: 'ログインに失敗しました。もう一度お試しください。',
    enterPassword: '続けるにはパスワードを入力してください。',
    appleCancelled: 'Apple でのサインインはキャンセルされました。',
    googleCancelled: 'Google でのログインはキャンセルされました。',
    noToken: 'Google ログインからトークンが返されませんでした。',
    noAccount: 'ログインしているアカウントがありません。',
    playGames: 'Play Games のログインを確認できませんでした。もう一度お試しください。',
    cannotVerify: 'このアカウントはアプリから確認できません。',
  },
} satisfies Translation['account'];
