import type { Translation } from '../../types';

export const home = {
  seePremium: 'Ver Premium',
  streakChip: { one: 'Sequência de {count} dia', other: 'Sequência de {count} dias' },
  theme: {
    toLight: 'Mudar para o modo claro',
    toDark: 'Mudar para o modo escuro',
  },
  sections: {
    modes: 'Modos de jogo',
    categories: 'Categorias',
  },
  modes: {
    survival: { title: 'Sobrevivência', description: 'Três vidas. Até onde você chega?' },
    campaign: { title: 'Campanha', description: 'Avance pelos mundos e ganhe estrelas.' },
    endless: { title: 'Infinito', description: 'Vidas ilimitadas. Busque o recorde.' },
    lockedA11y: '{title}, modo Premium',
  },
  categories: {
    lockedA11y: '{name}, categoria Premium',
    playA11y: 'Jogar perguntas de {name}',
    comingSoon: 'Mais em breve',
  },
  daily: {
    title: 'Desafio do Dia',
    play: 'Jogar',
    playA11y: 'Jogar o Desafio do Dia',
    doneA11y: 'Desafio do Dia concluído, ver seu resultado',
    comeBack: 'Volte amanhã',
    done: 'Desafio concluído',
    todayScore: 'Hoje · {score} pts',
    streak: { one: '🔥 Sequência de {count} dia', other: '🔥 Sequência de {count} dias' },
    streakKeep: {
      one: '🔥 Sequência de {count} dia — jogue hoje para mantê-la',
      other: '🔥 Sequência de {count} dias — jogue hoje para mantê-la',
    },
    nextIn: 'Próximo desafio em',
    nextInA11y: 'Próximo Desafio do Dia em {time}',
    hoursMinutes: '{hours}h {minutes}min',
    hours: '{hours}h',
    minutes: '{minutes}min',
  },
  streakSheet: {
    headline: { one: 'Sequência de {count} dia!', other: 'Sequência de {count} dias!' },
    start: 'Comece uma sequência hoje',
    safe: 'Você já jogou o Desafio do Dia — sua sequência está garantida.',
    extend: 'Jogue o Desafio do Dia para chegar a {next}.',
    pitch: 'Jogue o Desafio do Dia todo dia para criar uma sequência e ganhar pontos extras.',
    freezes: {
      one: '🧊 {count} protetor de sequência pronto',
      other: '🧊 {count} protetores de sequência prontos',
    },
    play: 'Jogar o Desafio do Dia',
    nice: 'Boa!',
    later: 'Depois',
    weekdays: 'D,S,T,Q,Q,S,S',
  },
  hearts: {
    unlimitedA11y: 'Corações ilimitados',
    leftA11y: '{count} de {max} corações restantes',
    outTitle: 'Sem corações',
    nextIn: 'Seu próximo coração chega em {time}. Os corações recarregam um a cada 15 minutos.',
    refillRate: 'Os corações recarregam um a cada 15 minutos.',
    goPremium: 'Seja Premium · corações ilimitados',
    refill: 'Recarregar corações · {cost} 🪙',
  },
  signInNudge: {
    title: 'Guarde seu progresso',
    body: 'Seu progresso está salvo neste aparelho. Faça backup no Google e sua campanha, museu, XP e moedas vão com você para um celular novo.',
    notNow: 'Agora não',
  },
  winback: {
    title: '{percent}% de desconto no primeiro ano',
    subtitle: {
      one: 'Um obrigado por jogar · termina em {count} dia',
      other: 'Um obrigado por jogar · termina em {count} dias',
    },
    a11y: {
      one: '{percent}% de desconto no seu primeiro ano de Premium. Termina em {count} dia.',
      other: '{percent}% de desconto no seu primeiro ano de Premium. Termina em {count} dias.',
    },
  },
} satisfies Translation['home'];
