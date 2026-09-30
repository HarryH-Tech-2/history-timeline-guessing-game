import type { Translation } from '../../types';

export const paywall = {
  personal: {
    category: {
      one: '{name}: {count} pregunta te espera',
      other: '{name}: {count} preguntas te esperan',
    },
    hearts: 'Próximo corazón en {time}, o no vuelvas a esperar nunca.',
    era: {
      one: '{era}: {stages} etapas y {count} evento por explorar',
      other: '{era}: {stages} etapas y {count} eventos por explorar',
    },
    progress: {
      one: 'Ya coleccionaste {count} artefacto y llegaste al nivel {level}. Te esperan {remaining} eventos más.',
      other: 'Ya coleccionaste {count} artefactos y llegaste al nivel {level}. Te esperan {remaining} eventos más.',
    },
  },
  plans: {
    monthly: 'Mensual',
    yearly: 'Anual',
    lifetime: 'De por vida',
  },
  period: {
    monthly: '/ mes',
    yearly: '/ año',
    lifetime: 'pago único',
  },
  planFooter: {
    monthly: 'Cobro mensual a través de {store}. Cancela cuando quieras {settings}.',
    yearly: 'Cobro anual a través de {store}. Cancela cuando quieras {settings}.',
    lifetime: 'Una compra única a través de {store}. Tuyo para siempre — nada se renueva.',
  },
  trialFooter: {
    one: 'Gratis por {count} día, luego {price} a través de {store}. Cancela antes de que termine la prueba y no se te cobrará.',
    other: 'Gratis por {count} días, luego {price} a través de {store}. Cancela antes de que termine la prueba y no se te cobrará.',
  },
  appleRenewalTerms:
    'El pago se carga a tu Cuenta de Apple al confirmar. Las suscripciones se renuevan automáticamente, a menos que se cancelen al menos 24 horas antes del final del período actual.',
  trialLength: {
    month: { one: '1 mes', other: '{count} meses' },
    week: { one: '1 semana', other: '{count} semanas' },
    day: { one: '{count} día', other: '{count} días' },
  },
  badge: {
    save: 'Ahorra {percent}%',
    bestValue: 'Mejor precio',
    trial: 'Prueba gratis de {length}',
    percentOff: '{percent}% de descuento',
  },
  cta: {
    monthly: 'Quiero la suscripción mensual',
    yearly: 'Quiero la suscripción anual',
    lifetime: 'Quiero acceso de por vida',
    thenPrice: 'luego {price}',
    trialWeek: 'Empezar mi semana gratis',
    trialDays: 'Empezar mi prueba gratis de {count} días',
    pleaseWait: 'Espera…',
  },
  card: {
    free: 'Gratis',
    forDays: { one: 'por {count} día', other: 'por {count} días' },
    firstYear: 'primer año',
    a11yTrial: 'prueba gratis de {length}, luego ',
    a11yOffer: '{price} el primer año, luego ',
  },
  perMonthBilledYearly: '{price}/mes, cobro anual',
  trialTimeline: {
    today: 'Hoy',
    unlocked: 'Todo desbloqueado',
    day: 'Día {day}',
    remind: 'Te avisamos',
    charge: '{price}, cancela cuando quieras',
  },
  winback: {
    headline: '{percent}% de descuento en tu primer año',
    endsIn: {
      one: 'Gracias por jugar · la oferta termina en {count} día',
      other: 'Gracias por jugar · la oferta termina en {count} días',
    },
    cta: 'Obtener {percent}% de descuento',
    ctaSub: '{price} el primer año',
    footer:
      '{price} tu primer año, luego {fullPrice} a través de {store}. Cancela cuando quieras {settings}.',
  },
  legal: {
    terms: 'Términos de uso',
    privacy: 'Política de privacidad',
  },
  youArePremium: 'Eres Premium',
  subscriptionActive: 'Tu suscripción está activa',
  done: 'Listo',
  alsoInPremium: 'También en Premium',
  notice: {
    unavailable: 'Las compras aún no están disponibles en esta versión.',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    noSubscription: 'No se encontró ninguna suscripción activa.',
  },
  trust: {
    lifetime: 'Pago único, nada se renueva',
    cancelAnytime: 'Cancela cuando quieras en {store}',
  },
  restore: 'Restaurar compras',
  benefits: {
    hearts: {
      short: 'Corazones ilimitados, sin esperas',
      title: 'Corazones ilimitados',
      detail: 'Falla todas las veces que quieras — sin tiempos de espera, sin recargas.',
    },
    coins: {
      short: 'Monedas ilimitadas para pistas',
      title: 'Monedas ilimitadas',
      detail: 'Pistas y protectores de racha cuando los quieras. Olvídate de contar monedas.',
    },
    campaign: {
      short: 'La Campaña completa, todas las eras',
      title: 'La Campaña completa',
      detail: 'Avanza más allá del Mundo Antiguo, desde la Edad Media hasta la Era Contemporánea.',
    },
    endless: {
      short: 'Modo Infinito, vidas ilimitadas',
      title: 'Modo Infinito',
      detail: 'Una partida sin fin con todo el catálogo y vidas ilimitadas.',
    },
    categories: {
      short: 'Todas las categorías desbloqueadas',
      title: 'Más categorías desbloqueadas',
      detail: 'Practica cada categoría premium por separado, y llegan más con el tiempo.',
    },
    museum: {
      short: 'Completa tu museo',
      title: 'Completa tu museo',
      detail: 'Colecciona todos los artefactos, incluidas las salas premium.',
    },
  },
  headline: {
    default: 'Desbloquea la campaña completa y obtén corazones ilimitados.',
    trialWeek: 'Empieza tu semana gratis',
    trialDays: 'Empieza tus {count} días gratis',
    hearts: 'Nunca vuelvas a esperar un corazón',
    campaign: 'Sigue tu viaje por la historia',
    winback: '¡Qué bueno verte de nuevo! Tu primer año con descuento',
    lockedCategory: 'Desbloquea todas las categorías',
    lockedMode: 'Juega al Infinito con vidas ilimitadas',
    onboardingTrial: '¡Bienvenido! Prueba todo gratis {span}',
  },
  trialSpan: {
    week: 'por una semana',
    days: 'por {count} días',
  },
  founder: {
    premium: '¡Gracias por apoyarme! Soy Harry, el creador de esta app. ¡Disfruta todo el archivo!',
    hearts: 'Hola, soy Harry, el creador de esta app 👋 ¿Sin corazones? Con Premium nunca esperas.',
    campaign: 'Hola, soy Harry, el creador de esta app 👋 Qué bueno que sigas en el viaje. ¡Queda mucho más!',
    eraComplete: 'Hola, soy Harry, el creador de esta app 👋 ¡Conquistaste el Mundo Antiguo! Hay más historia.',
    winback: 'Hola, soy Harry, el creador de esta app 👋 Qué gusto que sigas jugando. ¡Un descuento de regalo!',
    lockedCategory: 'Hola, soy Harry, el creador de esta app 👋 Siempre agrego categorías, y Premium las abre todas.',
    lockedMode: 'Hola, soy Harry, el creador de esta app 👋 El Infinito es mi modo favorito. ¡Ojalá te encante!',
    onboardingTrial: 'Hola, soy Harry, el creador de esta app 👋 La hago yo solo. ¡Prueba todo gratis {span}!',
    onboarding: 'Hola, soy Harry, el creador de esta app 👋 La hago yo solo, y Premium la ayuda a crecer.',
    default: 'Hola, soy Harry, el creador de esta app 👋 La hago yo solo. Premium la ayuda a crecer. ¡Gracias!',
    photo: 'Foto de Harry, el desarrollador',
  },
  summaryUpsell: {
    eyebrow: '👑 Premium',
    title: '¿Te está gustando?',
    body: 'Premium: corazones ilimitados, la Campaña completa y el Infinito',
    cta: 'Ver Premium',
  },
  eraConquered: {
    title: '¡Conquista completa: {name}!',
    titleFallback: '¡Era conquistada!',
    body: {
      one: 'Lo que sigue: {next}. Premium abre {count} era más y {stages} etapas de historia.',
      other: 'Lo que sigue: {next}. Premium abre {count} eras más y {stages} etapas de historia.',
    },
    bodyFallback: 'Te espera mucha más historia con Premium.',
    unlock: 'Desbloquear todas las eras',
    notNow: 'Ahora no',
  },
} satisfies Translation['paywall'];
