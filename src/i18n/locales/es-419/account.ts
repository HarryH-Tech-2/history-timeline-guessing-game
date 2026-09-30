import type { Translation } from '../../types';

export const account = {
  somethingWrong: 'Algo salió mal.',
  signIn: {
    title: 'Iniciar sesión',
    offline:
      'Las cuentas necesitan conexión y no están disponibles en esta versión. Tu progreso se guarda en este dispositivo.',
    backupTitle: 'Respalda tu progreso',
    backupBody:
      'Opcional. Respalda con {providers} y tu progreso te acompaña a un teléfono nuevo. Todo lo que has ganado hasta ahora se conserva.',
    switchTitle: 'Cambiar de cuenta',
    switchBody: 'Inicia sesión con otra cuenta.',
    benefits: {
      devices: 'Tu progreso, museo y campaña te acompañan a cualquier dispositivo.',
      name: 'Tu nombre en la clasificación global sigue siendo tuyo.',
      oneTap: 'Un toque — sin contraseñas que recordar.',
    },
    google: 'Continuar con Google',
    working: 'Un momento…',
    purchasesNote:
      'Las compras Premium están vinculadas a tu cuenta de {store}, no a un inicio de sesión. Puedes comprar y restaurar Premium sin una cuenta.',
  },
  delete: {
    title: 'Eliminar cuenta',
    guest:
      'Estás jugando como invitado, así que no hay ninguna cuenta que eliminar. Al desinstalar la app se borra el progreso guardado en el dispositivo.',
    offline: 'Las cuentas no están disponibles en esta versión.',
    signedInAs: 'Sesión iniciada como {name}',
    willDelete: 'Esto eliminará de forma permanente',
    items: {
      signIn: 'Tu acceso de inicio de sesión. No podrás volver a iniciar sesión con esta cuenta.',
      cloud: 'Datos guardados en la nube: XP, nivel, monedas, corazones, museo, progreso de la campaña y mejores puntajes.',
      leaderboard: 'Tu fila en la clasificación global.',
      device: 'La copia de ese progreso en este dispositivo.',
    },
    purchasesNote:
      'Las compras las gestiona {store} y no se ven afectadas. Una suscripción Premium activa se debe cancelar por separado {where}.',
    passwordPlaceholder: 'Confirma tu contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    show: 'Mostrar',
    hide: 'Ocultar',
    enterPassword: 'Escribe tu contraseña para confirmar.',
    submit: 'Eliminar mi cuenta',
    deleting: 'Eliminando…',
    confirmTitle: '¿Eliminar tu cuenta?',
    confirmBody: 'Esto elimina de forma permanente tu cuenta y todo su progreso. No se puede deshacer.',
    confirmButton: 'Eliminar',
  },
  errors: {
    offline: 'Las cuentas necesitan conexión y no están disponibles en esta versión.',
    alreadyLinked: 'Esa cuenta ya está vinculada a otro jugador.',
    wrongPassword: 'El correo o la contraseña son incorrectos.',
    recentLogin: 'Vuelve a iniciar sesión antes de eliminar tu cuenta.',
    tooMany: 'Demasiados intentos — espera un momento e intenta de nuevo.',
    network: 'Sin conexión — revisa tu red e intenta de nuevo.',
    failed: 'No se pudo iniciar sesión. Intenta de nuevo.',
    enterPassword: 'Escribe tu contraseña para continuar.',
    appleCancelled: 'Se canceló el inicio de sesión con Apple.',
    googleCancelled: 'Se canceló el inicio de sesión con Google.',
    noToken: 'El inicio de sesión con Google no devolvió un token.',
    noAccount: 'No hay ninguna cuenta con sesión iniciada.',
    playGames: 'No pudimos verificar tu inicio de sesión en Play Games. Intenta de nuevo.',
    cannotVerify: 'Esta cuenta no se puede verificar desde la app.',
  },
} satisfies Translation['account'];
