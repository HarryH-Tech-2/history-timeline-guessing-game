import type { Translation } from '../../types';

export const modes = {
  run: {
    next: 'Próxima',
    finish: 'Finalizar',
    seeResults: 'Ver resultados',
    playAgain: 'Jogar de novo',
    home: 'Início',
    seePremium: 'Ver Premium',
  },
  category: {
    notFound: 'Categoria não encontrada',
    backHome: 'Voltar ao início',
    lockedTitle: '{name} é uma categoria Premium',
    lockedBody: 'Assine para liberar — e ganhe corações ilimitados.',
    completeTitle: '{name} — concluída',
    completeSubtitle: 'Todas as perguntas de {name}, respondidas.',
    exactAnswers: 'Respostas exatas',
    shareTitle: '{name} · concluída',
  },
  region: {
    title: 'Regional',
    intro: 'Escolha uma região e coloque seus momentos marcantes na linha do tempo.',
    a11y: { one: 'Jogar {name}, {count} pergunta', other: 'Jogar {name}, {count} perguntas' },
    count: { one: '{count} pergunta', other: '{count} perguntas' },
    countPerRun: {
      one: '{count} pergunta · {perRun} por partida',
      other: '{count} perguntas · {perRun} por partida',
    },
  },
  survival: {
    outOfLives: 'Sem vidas',
    roundsSurvived: 'Rodadas sobrevividas',
    best: 'Recorde',
    bestValue: { one: '{count} rodada · {score}', other: '{count} rodadas · {score}' },
    shareTitle: { one: 'Sobrevivência · {count} rodada', other: 'Sobrevivência · {count} rodadas' },
  },
  endless: {
    round: 'Rodada {round}',
    roundBest: 'Rodada {round} · Recorde {best}',
    lockedTitle: 'O modo Infinito é Premium',
    lockedBody: 'Assine para buscar um recorde com vidas ilimitadas — e corações ilimitados em todo o resto.',
  },
  daily: {
    complete: 'Desafio do Dia concluído',
    streakSubtitle: {
      one: '🔥 Sequência de {count} dia — volte amanhã para mantê-la viva.',
      other: '🔥 Sequência de {count} dias — volte amanhã para mantê-la viva.',
    },
    freshSet: 'Volte amanhã para um novo desafio.',
    perfectAnswers: 'Respostas perfeitas',
    questionFallback: 'Pergunta',
  },
} satisfies Translation['modes'];
