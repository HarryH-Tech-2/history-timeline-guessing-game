import type { Translation } from '../../types';

export const modes = {
  run: {
    next: '次へ',
    finish: '終了',
    seeResults: '結果を見る',
    playAgain: 'もう一度',
    home: 'ホーム',
    seePremium: 'プレミアムを見る',
  },
  category: {
    notFound: 'カテゴリーが見つかりません',
    backHome: 'ホームに戻る',
    lockedTitle: '{name}はプレミアムカテゴリーです',
    lockedBody: '登録するとロック解除 — さらにハートも無制限に。',
    completeTitle: '{name} — コンプリート',
    completeSubtitle: '{name}の問題にすべて回答しました。',
    exactAnswers: 'ぴったり正解',
    shareTitle: '{name} · コンプリート',
  },
  region: {
    title: '地域別',
    intro: '地域を選んで、その歴史を形づくった出来事を年表に置こう。',
    a11y: { one: '{name}をプレイ、{count}問', other: '{name}をプレイ、{count}問' },
    count: { one: '{count}問', other: '{count}問' },
    countPerRun: {
      one: '{count}問 · 1回{perRun}問',
      other: '{count}問 · 1回{perRun}問',
    },
  },
  survival: {
    outOfLives: 'ライフがなくなりました',
    roundsSurvived: '生き残ったラウンド',
    best: 'ベスト',
    bestValue: { one: '{count}ラウンド · {score}', other: '{count}ラウンド · {score}' },
    shareTitle: { one: 'サバイバル · {count}ラウンド', other: 'サバイバル · {count}ラウンド' },
  },
  /** A free player's taster of Endless or a premium category. */
  sample: {
    round: '無料お試し · {round}/{total}',
    overTitle: '{name}のお試しはここまで',
    played: { one: '{count}ラウンドプレイ', other: '{count}ラウンドプレイ' },
    withPremium: 'プレミアムなら{total}',
    keepPlaying: '{name}を続ける',
    endlessBody: 'プレミアムなら終わりなし。全問題にライフ無制限で挑戦できます。',
    categoryBody: 'プレミアムなら{name}の全問題をプレイでき、ハートも無制限に。',
  },
  endless: {
    round: 'ラウンド{round}',
    roundBest: 'ラウンド{round} · ベスト{best}',
    lockedTitle: 'エンドレスはプレミアムモードです',
    lockedBody: '登録すると、ライフ無制限でハイスコアに挑戦できます — さらに他のモードでもハートが無制限に。',
  },
  daily: {
    complete: 'デイリー完了',
    streakSubtitle: {
      one: '🔥 {count}日連続 — 明日も来て記録をつなげよう。',
      other: '🔥 {count}日連続 — 明日も来て記録をつなげよう。',
    },
    freshSet: '明日また新しい問題が届きます。',
    perfectAnswers: 'ぴったり正解',
    questionFallback: '問題',
  },
} satisfies Translation['modes'];
