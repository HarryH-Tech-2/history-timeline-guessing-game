import type { Translation } from '../../types';

export const reminders = {
  nudge: {
    title: 'Quer um lembrete amanhã?',
    body: 'Um aviso por dia às {hour}:00 quando houver um Desafio do Dia novo. Nunca num dia em que você já jogou.',
    accept: 'Me lembre',
    notNow: 'Agora não',
  },
  channel: 'Lembrete diário',
  daily: {
    title: 'Seu Desafio do Dia chegou 🏛️',
    body: 'Oito datas novas. Mantenha sua sequência.',
  },
  trial: {
    title: {
      one: 'Seu teste grátis termina em {count} dia',
      other: 'Seu teste grátis termina em {count} dias',
    },
    body: 'Não faça nada para continuar Premium, ou cancele quando quiser na loja {store}.',
  },
  winback: {
    title: '{percent}% de desconto no seu primeiro ano de Premium',
    body: 'Um obrigado por jogar: todas as eras, categorias e modos. Só esta semana.',
  },
} satisfies Translation['reminders'];
