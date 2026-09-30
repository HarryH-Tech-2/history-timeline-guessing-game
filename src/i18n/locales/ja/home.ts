import type { Translation } from '../../types';

export const home = {
  seePremium: 'プレミアムを見る',
  streakChip: { one: '{count}日連続', other: '{count}日連続' },
  theme: {
    toLight: 'ライトモードに切り替え',
    toDark: 'ダークモードに切り替え',
  },
  sections: {
    modes: 'ゲームモード',
    categories: 'カテゴリー',
  },
  modes: {
    survival: { title: 'サバイバル', description: 'ライフは3つ。どこまで行ける？' },
    campaign: { title: 'キャンペーン', description: '世界を巡って星を集めよう。' },
    endless: { title: 'エンドレス', description: 'ライフ無制限。ハイスコアを目指そう。' },
    lockedA11y: '{title}、プレミアムモード',
  },
  categories: {
    lockedA11y: '{name}、プレミアムカテゴリー',
    playA11y: '{name}の問題をプレイ',
    comingSoon: '続々追加予定',
  },
  daily: {
    title: '今日のデイリー',
    play: 'プレイ',
    playA11y: '今日のデイリーをプレイ',
    doneA11y: 'デイリー完了、結果を見る',
    comeBack: 'また明日来てね',
    done: 'デイリー完了',
    todayScore: '今日 · {score}点',
    streak: { one: '🔥 {count}日連続', other: '🔥 {count}日連続' },
    streakKeep: {
      one: '🔥 {count}日連続 — 今日プレイして記録をキープ',
      other: '🔥 {count}日連続 — 今日プレイして記録をキープ',
    },
    nextIn: '次のデイリーまで',
    nextInA11y: '次のデイリーまで{time}',
    hoursMinutes: '{hours}時間{minutes}分',
    hours: '{hours}時間',
    minutes: '{minutes}分',
  },
  streakSheet: {
    headline: { one: '{count}日連続！', other: '{count}日連続！' },
    start: '今日から連続記録を始めよう',
    safe: '今日のデイリーはプレイ済み。連続記録はキープされています。',
    extend: '今日のデイリーをプレイして{next}日連続にしよう。',
    pitch: '毎日デイリーをプレイして連続記録を伸ばし、ボーナスポイントを獲得しよう。',
    freezes: { one: '🧊 ストリークフリーズ {count}個 準備OK', other: '🧊 ストリークフリーズ {count}個 準備OK' },
    play: '今日のデイリーをプレイ',
    nice: 'いいね！',
    later: 'あとで',
    weekdays: '日,月,火,水,木,金,土',
  },
  hearts: {
    unlimitedA11y: 'ハート無制限',
    leftA11y: 'ハート残り{count}/{max}',
    outTitle: 'ハートがありません',
    nextIn: '次のハートまであと{time}。ハートは15分ごとに1つ回復します。',
    refillRate: 'ハートは15分ごとに1つ回復します。',
    goPremium: 'プレミアムにする · ハート無制限',
    refill: 'ハートを回復 · {cost} 🪙',
  },
  signInNudge: {
    title: '進行状況を守ろう',
    body: '進行状況はこの端末に保存されています。Googleにバックアップすれば、キャンペーン、博物館、XP、コインを新しいスマホに引き継げます。',
    notNow: '今はしない',
  },
  winback: {
    title: '初年度{percent}%オフ',
    subtitle: {
      one: 'プレイへの感謝をこめて · 残り{count}日',
      other: 'プレイへの感謝をこめて · 残り{count}日',
    },
    a11y: {
      one: 'プレミアム初年度が{percent}%オフ。残り{count}日。',
      other: 'プレミアム初年度が{percent}%オフ。残り{count}日。',
    },
  },
} satisfies Translation['home'];
