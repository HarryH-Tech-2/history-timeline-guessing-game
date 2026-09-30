import type { Translation } from '../../types';

export const reminders = {
  nudge: {
    title: '明日リマインドしますか？',
    body: '新しいデイリーが届いたら、1日1回{hour}:00にお知らせします。プレイ済みの日は通知しません。',
    accept: 'リマインドする',
    notNow: '今はしない',
  },
  channel: 'デイリーのリマインダー',
  daily: {
    title: '今日のデイリーが届きました 🏛️',
    body: '新しい年代が8問。連続記録をキープしよう。',
  },
  trial: {
    title: {
      one: '無料トライアルはあと{count}日で終了します',
      other: '無料トライアルはあと{count}日で終了します',
    },
    body: 'そのままでプレミアムを継続。解約は{store}からいつでもできます。',
  },
  winback: {
    title: 'プレミアム初年度が{percent}%オフ',
    body: 'プレイへの感謝をこめて：すべての時代、カテゴリー、モードが遊び放題。今週限定です。',
  },
} satisfies Translation['reminders'];
