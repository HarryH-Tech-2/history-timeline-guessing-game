import type { Translation } from '../../types';

export const paywall = {
  personal: {
    category: {
      one: '{name}：{count}問があなたを待っています',
      other: '{name}：{count}問があなたを待っています',
    },
    hearts: '次のハートまで{time}。プレミアムならもう待つ必要はありません。',
    era: {
      one: '{era}：{stages}ステージ・{count}の出来事',
      other: '{era}：{stages}ステージ・{count}の出来事',
    },
    progress: {
      one: '収蔵品を{count}点集め、レベル{level}に到達しました。まだ{remaining}の出来事が待っています。',
      other: '収蔵品を{count}点集め、レベル{level}に到達しました。まだ{remaining}の出来事が待っています。',
    },
  },
  /** The plan names on the cards. */
  plans: {
    monthly: '月額',
    yearly: '年額',
    lifetime: '買い切り',
  },
  /** A store price's cadence: "£2.49 / month", "£39.99 once". */
  period: {
    monthly: '/ 月',
    yearly: '/ 年',
    lifetime: '買い切り',
  },
  /** Small print under the buy button. {settings} carries its own "in". */
  planFooter: {
    monthly: '{store}で毎月請求されます。いつでも{settings}解約できます。',
    yearly: '{store}で毎年請求されます。いつでも{settings}解約できます。',
    lifetime: '{store}での1回限りの購入です。更新はなく、ずっとお使いいただけます。',
  },
  trialFooter: {
    one: '{count}日間無料、その後は{store}で{price}。無料体験の終了前に解約すれば料金はかかりません。',
    other: '{count}日間無料、その後は{store}で{price}。無料体験の終了前に解約すれば料金はかかりません。',
  },
  appleRenewalTerms:
    'お支払いは購入の確定時にApple Accountに請求されます。定期購入は、現在の期間が終了する24時間前までに解約しない限り自動更新されます。',
  /** A trial's length as it reads inside "{length} free trial". */
  trialLength: {
    month: { one: '1か月', other: '{count}か月' },
    week: { one: '1週間', other: '{count}週間' },
    day: { one: '{count}日間', other: '{count}日間' },
  },
  badge: {
    save: '{percent}%お得',
    bestValue: 'いちばんお得',
    trial: '{length}無料体験',
    percentOff: '{percent}%オフ',
  },
  cta: {
    monthly: '月額プランに登録',
    yearly: '年額プランに登録',
    lifetime: '買い切りで購入',
    thenPrice: 'その後{price}',
    trialWeek: '1週間の無料体験を始める',
    trialDays: '{count}日間の無料体験を始める',
    pleaseWait: 'お待ちください…',
  },
  card: {
    free: '無料',
    forDays: { one: '{count}日間', other: '{count}日間' },
    firstYear: '初年度',
    /** Screen-reader prefixes before the price. */
    a11yTrial: '{length}の無料体験、その後 ',
    a11yOffer: '初年度{price}、その後 ',
  },
  perMonthBilledYearly: '月あたり{price}、年払い',
  trialTimeline: {
    today: '今日',
    unlocked: 'すべて解放',
    day: '{day}日目',
    remind: 'お知らせします',
    charge: '{price}、いつでも解約OK',
  },
  winback: {
    headline: '初年度{percent}%オフ',
    endsIn: {
      one: 'プレイありがとうございます · あと{count}日で終了',
      other: 'プレイありがとうございます · あと{count}日で終了',
    },
    cta: '{percent}%オフで登録',
    ctaSub: '初年度{price}',
    footer:
      '初年度は{price}、その後は{store}で{fullPrice}。いつでも{settings}解約できます。',
  },
  legal: {
    terms: '利用規約',
    privacy: 'プライバシーポリシー',
  },
  youArePremium: 'プレミアム会員です',
  subscriptionActive: '定期購入は有効です',
  done: '完了',
  alsoInPremium: 'プレミアムならこちらも',
  notice: {
    unavailable: 'このビルドではまだ購入できません。',
    error: '問題が発生しました。もう一度お試しください。',
    noSubscription: '有効な定期購入が見つかりません。',
  },
  trust: {
    lifetime: '1回限りの購入、更新なし',
    cancelAnytime: '{store}でいつでも解約OK',
  },
  restore: '購入を復元',
  benefits: {
    hearts: {
      short: 'ハート無制限、待ち時間なし',
      title: 'ハート無制限',
      detail: '何度ミスしても大丈夫。回復待ちも補充もいりません。',
    },
    coins: {
      short: 'ヒント用コインが無制限',
      title: 'コイン無制限',
      detail: 'ヒントも連続記録の保護も使い放題。もうコインを数える必要はありません。',
    },
    campaign: {
      short: 'すべての時代のキャンペーン',
      title: 'キャンペーンをすべて',
      detail: '古代の先へ。中世から現代まで旅を続けましょう。',
    },
    endless: {
      short: 'エンドレスモード、ライフ無制限',
      title: 'エンドレスモード',
      detail: '全問題に挑み続けられる、ライフ無制限のモードです。',
    },
    categories: {
      short: '全カテゴリーを解放',
      title: 'さらに多くのカテゴリー',
      detail: 'プレミアムカテゴリーを個別に練習できます。今後も追加予定です。',
    },
    museum: {
      short: '博物館を完成させよう',
      title: '博物館を完成させよう',
      detail: 'プレミアム展示室も含め、すべての収蔵品を集めましょう。',
    },
  },
  headline: {
    default: 'キャンペーンをすべて解放して、ハートを無制限に。',
    trialWeek: '1週間の無料体験を始める',
    trialDays: '{count}日間の無料体験を始める',
    hearts: 'もうハートを待つ必要はありません',
    campaign: '歴史の旅を続けよう',
    winback: 'おかえりなさい！初年度を割引価格で',
    lockedCategory: 'すべてのカテゴリーを解放',
    lockedMode: 'ライフ無制限でエンドレスを遊ぼう',
    onboardingTrial: 'ようこそ！{span}すべて無料でお試しください',
  },
  /** "for a week" / "for 3 days", inside a headline or the founder's line. */
  trialSpan: {
    week: '1週間',
    days: '{count}日間',
  },
  /** Harry's speech bubble: first person, warm, about 70 characters. */
  founder: {
    premium: '応援ありがとう！このアプリを作ったHarryです。すべての収蔵品を楽しんでください。',
    hearts: 'こんにちは、このアプリを作ったHarryです👋 ハート切れ？プレミアムなら待たずに遊べます。',
    campaign: 'こんにちは、このアプリを作ったHarryです👋 旅を楽しんでくれてうれしいです。まだまだ続きます。',
    eraComplete: 'こんにちは、このアプリを作ったHarryです👋 古代を制覇しましたね！まだまだ歴史が待っています。',
    winback: 'こんにちは、このアプリを作ったHarryです👋 遊び続けてくれてうれしいです。お礼の割引をどうぞ。',
    lockedCategory: 'こんにちは、このアプリを作ったHarryです👋 カテゴリーは増え続けています。プレミアムなら全部遊べます。',
    lockedMode: 'こんにちは、このアプリを作ったHarryです👋 エンドレスは私のいちばん好きな遊び方です！',
    onboardingTrial: 'こんにちは、このアプリを作ったHarryです👋 一人で開発しています。{span}すべて無料でどうぞ！',
    onboarding: 'こんにちは、このアプリを作ったHarryです👋 一人で開発しています。プレミアムが開発の支えになります。',
    default: 'こんにちは、このアプリを作ったHarryです👋 一人で開発しています。プレミアムが支えになります。ありがとう！',
    photo: '開発者Harryの写真',
  },
  summaryUpsell: {
    eyebrow: '👑 プレミアム',
    title: '楽しんでいますか？',
    body: 'プレミアム：ハート無制限、キャンペーン全編、エンドレス',
    cta: 'プレミアムを見る',
  },
  eraConquered: {
    title: '{name}を制覇！',
    titleFallback: '時代を制覇！',
    body: {
      one: '次は{next}。プレミアムなら、さらに{count}つの時代と{stages}ステージの歴史が解放されます。',
      other: '次は{next}。プレミアムなら、さらに{count}つの時代と{stages}ステージの歴史が解放されます。',
    },
    bodyFallback: 'プレミアムで、さらに多くの歴史が待っています。',
    unlock: 'すべての時代を解放',
    notNow: '今はしない',
  },
} satisfies Translation['paywall'];
