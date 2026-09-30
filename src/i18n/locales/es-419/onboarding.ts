import type { Translation } from '../../types';

export const onboarding = {
  skip: 'Omitir',
  stepOf: 'Paso {step} de {total}',
  welcome: {
    title: 'Todo evento tiene un año.',
    subtitle: '¿Qué tan cerca puedes llegar?',
    mascot: 'Soy Minerva. Vamos a averiguarlo.',
    next: 'Muéstrame',
  },
  firstGuess: {
    coachDrag: 'Arrastra para mover',
    coachStep: 'Un año a la vez',
    gotIt: 'Entendido',
    eyebrow: 'Tu primera respuesta',
    title: '¿Cuándo pasó esto?',
    notice: 'Quedar a 20 años o menos cuenta como acierto, y el evento entra a tu museo.',
  },
  why: {
    eyebrow: 'Por qué juegas',
    title: 'Tres formas de ganar',
    museumTitle: 'Arma tu museo',
    museumText: 'Acércate y el evento se vuelve un artefacto de tu colección.',
    dailyTitle: 'Juega el Reto del día',
    dailyText: 'Ocho preguntas, las mismas para todos, una vez al día. Mantén viva tu racha.',
    boardsTitle: 'Sube en la clasificación',
    boardsText: 'Hoy, esta semana o de todos los tiempos. Siempre hay un puesto a tu alcance.',
    next: 'Ya casi',
  },
  setup: {
    eyebrow: 'Una última cosa',
    title: 'Hazlo tuyo',
    nameLabel: 'Tu nombre en la clasificación',
    nameA11y: 'Tu nombre de jugador',
    nameHint: 'Quédate con {handle} o elige uno propio. Puedes cambiarlo cuando quieras.',
    reminderTitle: 'Recordatorio diario',
    reminderBody: 'Un aviso al día para que tu racha sobreviva. Desactivado por defecto.',
    playDaily: 'Jugar el Reto del día',
    explore: 'Explorar primero',
  },
} satisfies Translation['onboarding'];
