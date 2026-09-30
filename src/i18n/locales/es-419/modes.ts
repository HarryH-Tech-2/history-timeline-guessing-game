import type { Translation } from '../../types';

export const modes = {
  run: {
    next: 'Siguiente',
    finish: 'Terminar',
    seeResults: 'Ver resultados',
    playAgain: 'Jugar de nuevo',
    home: 'Inicio',
    seePremium: 'Ver Premium',
  },
  category: {
    notFound: 'Categoría no encontrada',
    backHome: 'Volver al inicio',
    lockedTitle: '{name} es una categoría Premium',
    lockedBody: 'Suscríbete para desbloquearla, y además corazones ilimitados.',
    completeTitle: '{name} — completada',
    completeSubtitle: 'Todas las preguntas de {name}, respondidas.',
    exactAnswers: 'Respuestas exactas',
    shareTitle: '{name} · completada',
  },
  region: {
    title: 'Regional',
    intro: 'Elige una región y ubica sus momentos clave en la línea de tiempo.',
    a11y: { one: 'Jugar {name}, {count} pregunta', other: 'Jugar {name}, {count} preguntas' },
    count: { one: '{count} pregunta', other: '{count} preguntas' },
    countPerRun: {
      one: '{count} pregunta · {perRun} por partida',
      other: '{count} preguntas · {perRun} por partida',
    },
  },
  survival: {
    outOfLives: 'Sin vidas',
    roundsSurvived: 'Rondas superadas',
    best: 'Récord',
    bestValue: { one: '{count} ronda · {score}', other: '{count} rondas · {score}' },
    shareTitle: { one: 'Supervivencia · {count} ronda', other: 'Supervivencia · {count} rondas' },
  },
  endless: {
    round: 'Ronda {round}',
    roundBest: 'Ronda {round} · Récord {best}',
    lockedTitle: 'El modo Infinito es Premium',
    lockedBody: 'Suscríbete para buscar un récord con vidas ilimitadas, y además corazones ilimitados en todo lo demás.',
  },
  daily: {
    complete: 'Reto del día completado',
    streakSubtitle: {
      one: '🔥 Racha de {count} día: vuelve mañana para mantenerla viva.',
      other: '🔥 Racha de {count} días: vuelve mañana para mantenerla viva.',
    },
    freshSet: 'Vuelve mañana para un nuevo reto.',
    perfectAnswers: 'Respuestas perfectas',
    questionFallback: 'Pregunta',
  },
} satisfies Translation['modes'];
