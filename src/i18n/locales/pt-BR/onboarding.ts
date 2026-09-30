import type { Translation } from '../../types';

export const onboarding = {
  skip: 'Pular',
  stepOf: 'Etapa {step} de {total}',
  welcome: {
    title: 'Todo evento tem um ano.',
    subtitle: 'Quão perto você consegue chegar?',
    mascot: 'Eu sou a Minerva. Vamos descobrir.',
    next: 'Me mostra',
  },
  firstGuess: {
    coachDrag: 'Arraste para mover',
    coachStep: 'Um ano por vez',
    gotIt: 'Entendi',
    eyebrow: 'Seu primeiro palpite',
    title: 'Quando isso aconteceu?',
    notice: 'Errar por até 20 anos conta como acerto, e o evento entra no seu museu.',
  },
  why: {
    eyebrow: 'Pelo que você joga',
    title: 'Três jeitos de vencer',
    museumTitle: 'Monte seu museu',
    museumText: 'Chegue perto e o evento vira um artefato na sua coleção.',
    dailyTitle: 'Jogue o Desafio do Dia',
    dailyText: 'Oito perguntas, as mesmas para todo mundo, uma vez por dia. Mantenha a sequência viva.',
    boardsTitle: 'Suba no ranking',
    boardsText: 'Hoje, nesta semana ou de todos os tempos. Sempre tem uma posição ao seu alcance.',
    next: 'Quase lá',
  },
  setup: {
    eyebrow: 'Última coisa',
    title: 'Deixe do seu jeito',
    nameLabel: 'Seu nome no ranking',
    nameA11y: 'Seu nome de jogador',
    nameHint: 'Fique com {handle} ou escolha um nome seu. Dá para mudar quando quiser.',
    reminderTitle: 'Lembrete diário',
    reminderBody: 'Um toque por dia para sua sequência não acabar. Desativado por padrão.',
    playDaily: 'Jogar o Desafio do Dia',
    explore: 'Explorar primeiro',
  },
} satisfies Translation['onboarding'];
