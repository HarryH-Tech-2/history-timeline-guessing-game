import type { Translation } from '../../types';

export const reminders = {
  nudge: {
    title: '¿Te lo recuerdo mañana?',
    body: 'Un aviso al día a las {hour}:00 cuando haya un Reto del día nuevo. Nunca en un día que ya jugaste.',
    accept: 'Recuérdamelo',
    notNow: 'Ahora no',
  },
  channel: 'Recordatorio diario',
  daily: {
    title: 'Tu Reto del día está listo 🏛️',
    body: 'Ocho fechas nuevas. Mantén tu racha.',
  },
  trial: {
    title: {
      one: 'Tu prueba gratis termina en {count} día',
      other: 'Tu prueba gratis termina en {count} días',
    },
    body: 'No hagas nada para seguir con Premium, o cancela cuando quieras en {store}.',
  },
  winback: {
    title: '{percent}% de descuento en tu primer año de Premium',
    body: 'Un agradecimiento por jugar: todas las eras, categorías y modos. Solo esta semana.',
  },
} satisfies Translation['reminders'];
