import type { Translation } from '../../types';

export const onboarding = {
  skip: 'スキップ',
  stepOf: 'ステップ {step}/{total}',
  welcome: {
    title: 'どんな出来事にも、年がある。',
    subtitle: 'どこまで近づけるかな？',
    mascot: 'ミネルヴァです。さあ、試してみましょう。',
    next: 'やってみる',
  },
  firstGuess: {
    coachDrag: 'ドラッグして動かす',
    coachStep: '1年ずつ動かせます',
    gotIt: 'わかった',
    eyebrow: 'はじめての回答',
    title: 'これはいつの出来事？',
    notice: '誤差20年以内なら当たり。出来事が博物館に加わります。',
  },
  why: {
    eyebrow: 'このゲームの楽しみ',
    title: '3つの楽しみ方',
    museumTitle: '博物館をつくろう',
    museumText: '近い年を当てると、その出来事が収蔵品としてコレクションに加わります。',
    dailyTitle: 'デイリーに挑戦',
    dailyText: '1日1回、全員共通の8問。連続記録をつなげよう。',
    boardsTitle: 'ランキングを駆け上がろう',
    boardsText: '今日、今週、全期間。いつでも手の届く順位があります。',
    next: 'あと少し',
  },
  setup: {
    eyebrow: '最後に',
    title: '自分好みに',
    nameLabel: 'ランキングに表示される名前',
    nameA11y: 'あなたのプレイヤー名',
    nameHint: '「{handle}」のままでも、好きな名前にしてもOK。いつでも変更できます。',
    reminderTitle: 'デイリーのリマインダー',
    reminderBody: '連続記録が途切れないよう、1日1回お知らせします。初期設定はオフです。',
    playDaily: '今日のデイリーをプレイ',
    explore: 'まずは見てみる',
  },
} satisfies Translation['onboarding'];
