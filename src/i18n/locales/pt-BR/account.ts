import type { Translation } from '../../types';

export const account = {
  somethingWrong: 'Algo deu errado.',
  signIn: {
    title: 'Entrar',
    offline:
      'Contas precisam de conexão e não estão disponíveis nesta versão. Seu progresso fica salvo neste aparelho.',
    backupTitle: 'Faça backup do seu progresso',
    backupBody:
      'Opcional. Faça backup com {providers} e seu progresso vai junto para um celular novo. Tudo o que você conquistou até agora é mantido.',
    switchTitle: 'Trocar de conta',
    switchBody: 'Entre com outra conta.',
    benefits: {
      devices: 'Seu progresso, museu e campanha vão com você para qualquer aparelho.',
      name: 'Seu nome no ranking global continua sendo seu.',
      oneTap: 'Um toque — sem senha para lembrar.',
    },
    google: 'Continuar com o Google',
    working: 'Aguarde…',
    purchasesNote:
      'As compras Premium ficam vinculadas à conta que você usa na loja {store}, não a um login. Você pode comprar e restaurar o Premium sem uma conta.',
  },
  delete: {
    title: 'Excluir conta',
    guest:
      'Você está jogando como convidado, então não há conta para excluir. Desinstalar o app apaga o progresso salvo no aparelho.',
    offline: 'Contas não estão disponíveis nesta versão.',
    signedInAs: 'Conectado como {name}',
    willDelete: 'Isto vai excluir para sempre',
    items: {
      signIn: 'Seu acesso de login. Você não vai conseguir entrar nessa conta de novo.',
      cloud: 'Dados salvos na nuvem: XP, nível, moedas, corações, museu, progresso da campanha e melhores pontuações.',
      leaderboard: 'Sua linha no ranking global.',
      device: 'A cópia desse progresso neste aparelho.',
    },
    purchasesNote:
      'As compras são gerenciadas pela loja {store} e não são afetadas. Uma assinatura Premium ativa precisa ser cancelada à parte {where}.',
    passwordPlaceholder: 'Confirme sua senha',
    showPassword: 'Mostrar senha',
    hidePassword: 'Ocultar senha',
    show: 'Mostrar',
    hide: 'Ocultar',
    enterPassword: 'Digite sua senha para confirmar.',
    submit: 'Excluir minha conta',
    deleting: 'Excluindo…',
    confirmTitle: 'Excluir sua conta?',
    confirmBody: 'Isto remove para sempre sua conta e todo o progresso dela. Não dá para desfazer.',
    confirmButton: 'Excluir',
  },
  errors: {
    offline: 'Contas precisam de conexão e não estão disponíveis nesta versão.',
    alreadyLinked: 'Essa conta já está vinculada a outro jogador.',
    wrongPassword: 'E-mail ou senha incorretos.',
    recentLogin: 'Entre de novo antes de excluir sua conta.',
    tooMany: 'Muitas tentativas — espere um pouco e tente de novo.',
    network: 'Sem conexão — verifique sua internet e tente de novo.',
    failed: 'Não foi possível entrar. Tente de novo.',
    enterPassword: 'Digite sua senha para continuar.',
    appleCancelled: 'O login com a Apple foi cancelado.',
    googleCancelled: 'O login com o Google foi cancelado.',
    noToken: 'O login com o Google não retornou um token.',
    noAccount: 'Nenhuma conta está conectada.',
    playGames: 'Não foi possível confirmar seu login no Play Games. Tente de novo.',
    cannotVerify: 'Esta conta não pode ser confirmada pelo app.',
  },
} satisfies Translation['account'];
