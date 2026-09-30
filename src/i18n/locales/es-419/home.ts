import type { Translation } from '../../types';

export const home = {
  seePremium: 'Ver Premium',
  streakChip: { one: 'Racha de {count} día', other: 'Racha de {count} días' },
  theme: {
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
  },
  sections: {
    modes: 'Modos de juego',
    categories: 'Categorías',
  },
  modes: {
    survival: { title: 'Supervivencia', description: 'Tres vidas. ¿Hasta dónde llegas?' },
    campaign: { title: 'Campaña', description: 'Recorre mundos y gana estrellas.' },
    endless: { title: 'Sin fin', description: 'Vidas ilimitadas. Ve por el récord.' },
    lockedA11y: '{title}, modo Premium',
  },
  categories: {
    lockedA11y: '{name}, categoría Premium',
    playA11y: 'Jugar preguntas de {name}',
    comingSoon: 'Más muy pronto',
  },
  daily: {
    title: 'Reto del día',
    play: 'Jugar',
    playA11y: 'Jugar el Reto del día',
    doneA11y: 'Reto del día completado, ver tu resultado',
    comeBack: 'Vuelve mañana',
    done: 'Reto completado',
    todayScore: 'Hoy · {score} pts',
    streak: { one: '🔥 Racha de {count} día', other: '🔥 Racha de {count} días' },
    streakKeep: {
      one: '🔥 Racha de {count} día — juega hoy para mantenerla',
      other: '🔥 Racha de {count} días — juega hoy para mantenerla',
    },
    nextIn: 'Próximo reto en',
    nextInA11y: 'Próximo Reto del día en {time}',
    hoursMinutes: '{hours} h {minutes} min',
    hours: '{hours} h',
    minutes: '{minutes} min',
  },
  streakSheet: {
    headline: { one: '¡Racha de {count} día!', other: '¡Racha de {count} días!' },
    start: 'Empieza una racha hoy',
    safe: 'Ya jugaste el Reto del día — tu racha está a salvo.',
    extend: 'Juega el Reto del día para llegar a {next}.',
    pitch: 'Juega el Reto del día todos los días para armar una racha y ganar puntos extra.',
    freezes: {
      one: '🧊 {count} protector de racha listo',
      other: '🧊 {count} protectores de racha listos',
    },
    play: 'Jugar el Reto del día',
    nice: '¡Genial!',
    later: 'Luego',
    weekdays: 'D,L,M,M,J,V,S',
  },
  hearts: {
    unlimitedA11y: 'Corazones ilimitados',
    leftA11y: 'Te quedan {count} de {max} corazones',
    outTitle: 'Sin corazones',
    nextIn: 'Tu próximo corazón llega en {time}. Los corazones se recargan de a uno cada 15 minutos.',
    refillRate: 'Los corazones se recargan de a uno cada 15 minutos.',
    goPremium: 'Hazte Premium · corazones ilimitados',
    refill: 'Recargar corazones · {cost} 🪙',
  },
  signInNudge: {
    title: 'Conserva tu progreso',
    body: 'Tu progreso está guardado en este dispositivo. Respáldalo con Google y tu campaña, museo, XP y monedas te seguirán a un teléfono nuevo.',
    notNow: 'Ahora no',
  },
  winback: {
    title: '{percent}% de descuento en tu primer año',
    subtitle: {
      one: 'Un agradecimiento por jugar · termina en {count} día',
      other: 'Un agradecimiento por jugar · termina en {count} días',
    },
    a11y: {
      one: '{percent}% de descuento en tu primer año de Premium. Termina en {count} día.',
      other: '{percent}% de descuento en tu primer año de Premium. Termina en {count} días.',
    },
  },
} satisfies Translation['home'];
