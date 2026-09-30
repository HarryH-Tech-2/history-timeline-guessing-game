import type { Translation } from '../../types';

export const paywall = {
  personal: {
    category: {
      one: '{name}: {count} pergunta esperando por você',
      other: '{name}: {count} perguntas esperando por você',
    },
    hearts: 'Próximo coração em {time}, ou nunca mais espere.',
    era: {
      one: '{era}: {stages} fases e {count} evento para explorar',
      other: '{era}: {stages} fases e {count} eventos para explorar',
    },
    progress: {
      one: 'Você já coletou {count} artefato e chegou ao nível {level}. Mais {remaining} eventos esperam por você.',
      other: 'Você já coletou {count} artefatos e chegou ao nível {level}. Mais {remaining} eventos esperam por você.',
    },
  },
  plans: {
    monthly: 'Mensal',
    yearly: 'Anual',
    lifetime: 'Vitalício',
  },
  period: {
    monthly: '/ mês',
    yearly: '/ ano',
    lifetime: 'pagamento único',
  },
  planFooter: {
    monthly: 'Cobrança mensal pela loja {store}. Cancele quando quiser {settings}.',
    yearly: 'Cobrança anual pela loja {store}. Cancele quando quiser {settings}.',
    lifetime: 'Uma compra única pela loja {store}. É seu para sempre — nada é renovado.',
  },
  trialFooter: {
    one: 'Grátis por {count} dia, depois {price} pela loja {store}. Cancele antes do fim do teste e você não será cobrado.',
    other: 'Grátis por {count} dias, depois {price} pela loja {store}. Cancele antes do fim do teste e você não será cobrado.',
  },
  appleRenewalTerms:
    'O pagamento é cobrado na sua Conta Apple quando você confirma. As assinaturas são renovadas automaticamente, a menos que sejam canceladas pelo menos 24 horas antes do fim do período atual.',
  trialLength: {
    month: { one: '1 mês', other: '{count} meses' },
    week: { one: '1 semana', other: '{count} semanas' },
    day: { one: '{count} dia', other: '{count} dias' },
  },
  badge: {
    save: 'Economize {percent}%',
    bestValue: 'Melhor valor',
    trial: 'Teste grátis de {length}',
    percentOff: '{percent}% off',
  },
  cta: {
    monthly: 'Quero a assinatura mensal',
    yearly: 'Quero a assinatura anual',
    lifetime: 'Quero o acesso vitalício',
    thenPrice: 'depois {price}',
    trialWeek: 'Começar minha semana grátis',
    trialDays: 'Começar meu teste grátis de {count} dias',
    pleaseWait: 'Aguarde…',
  },
  card: {
    free: 'Grátis',
    forDays: { one: 'por {count} dia', other: 'por {count} dias' },
    firstYear: 'primeiro ano',
    a11yTrial: 'teste grátis de {length}, depois ',
    a11yOffer: '{price} no primeiro ano, depois ',
  },
  perMonthBilledYearly: '{price}/mês, cobrança anual',
  trialTimeline: {
    today: 'Hoje',
    unlocked: 'Tudo desbloqueado',
    day: 'Dia {day}',
    remind: 'A gente te avisa',
    charge: '{price}, cancele quando quiser',
  },
  winback: {
    headline: '{percent}% off no seu primeiro ano',
    endsIn: {
      one: 'Obrigado por jogar · a oferta termina em {count} dia',
      other: 'Obrigado por jogar · a oferta termina em {count} dias',
    },
    cta: 'Pegar {percent}% off',
    ctaSub: '{price} no primeiro ano',
    footer:
      '{price} no seu primeiro ano, depois {fullPrice} pela loja {store}. Cancele quando quiser {settings}.',
  },
  legal: {
    terms: 'Termos de Uso',
    privacy: 'Política de Privacidade',
  },
  youArePremium: 'Você é Premium',
  subscriptionActive: 'Sua assinatura está ativa',
  done: 'Pronto',
  alsoInPremium: 'Também no Premium',
  notice: {
    unavailable: 'As compras ainda não estão disponíveis nesta versão.',
    error: 'Algo deu errado. Tente de novo.',
    noSubscription: 'Nenhuma assinatura ativa encontrada.',
  },
  trust: {
    lifetime: 'Compra única, nada é renovado',
    cancelAnytime: 'Cancele quando quiser na loja {store}',
  },
  restore: 'Restaurar compras',
  benefits: {
    hearts: {
      short: 'Corações ilimitados, sem espera',
      title: 'Corações ilimitados',
      detail: 'Erre quantas vezes quiser — sem tempo de espera, sem recargas.',
    },
    coins: {
      short: 'Moedas ilimitadas para dicas',
      title: 'Moedas ilimitadas',
      detail: 'Dicas e protetores de sequência sempre que quiser. Nunca mais conte moedas.',
    },
    campaign: {
      short: 'A Campanha completa, todas as eras',
      title: 'A Campanha completa',
      detail: 'Avance além do Mundo Antigo, da Idade Média até a Era Moderna.',
    },
    endless: {
      short: 'Modo Infinito, vidas ilimitadas',
      title: 'Modo Infinito',
      detail: 'Uma partida sem fim com o catálogo inteiro e vidas ilimitadas.',
    },
    categories: {
      short: 'Todas as categorias liberadas',
      title: 'Mais categorias liberadas',
      detail: 'Pratique cada categoria premium separadamente, com mais chegando com o tempo.',
    },
    museum: {
      short: 'Complete seu museu',
      title: 'Complete seu museu',
      detail: 'Colecione todos os artefatos, incluindo as alas premium.',
    },
  },
  headline: {
    default: 'Desbloqueie a campanha completa e tenha corações ilimitados.',
    trialWeek: 'Comece sua semana grátis',
    trialDays: 'Comece seus {count} dias grátis',
    hearts: 'Nunca mais espere por um coração',
    campaign: 'Continue sua jornada pela história',
    winback: 'Que bom te ver de volta! Seu primeiro ano com desconto',
    lockedCategory: 'Libere todas as categorias',
    lockedMode: 'Jogue o Infinito com vidas ilimitadas',
    onboardingTrial: 'Boas-vindas! Experimente tudo grátis {span}',
  },
  trialSpan: {
    week: 'por uma semana',
    days: 'por {count} dias',
  },
  founder: {
    premium: 'Obrigado por me apoiar! Sou o Harry, criador deste app. Aproveite o arquivo inteiro!',
    hearts: 'Oi, eu sou o Harry, criador deste app 👋 Sem corações? Com o Premium você nunca espera.',
    campaign: 'Oi, eu sou o Harry, criador deste app 👋 Que bom ter você na jornada. Vem muito mais por aí!',
    eraComplete: 'Oi, eu sou o Harry, criador deste app 👋 Você conquistou o Mundo Antigo! Tem mais história.',
    winback: 'Oi, eu sou o Harry, criador deste app 👋 Que bom que você segue jogando. Um desconto de presente!',
    lockedCategory: 'Oi, eu sou o Harry, criador deste app 👋 Sempre adiciono categorias, e o Premium libera todas.',
    lockedMode: 'Oi, eu sou o Harry, criador deste app 👋 O Infinito é meu modo favorito. Espero que curta!',
    onboardingTrial: 'Oi, eu sou o Harry, criador deste app 👋 Faço tudo sozinho. Teste tudo grátis {span}!',
    onboarding: 'Oi, eu sou o Harry, criador deste app 👋 Faço tudo sozinho, e o Premium ajuda o jogo a crescer.',
    default: 'Oi, eu sou o Harry, criador deste app 👋 Faço tudo sozinho. O Premium ajuda a crescer. Valeu!',
    photo: 'Foto do Harry, o desenvolvedor',
  },
  summaryUpsell: {
    eyebrow: '👑 Premium',
    title: 'Curtindo?',
    body: 'Premium: corações ilimitados, a Campanha completa e o Infinito',
    cta: 'Ver o Premium',
  },
  eraConquered: {
    title: 'Conquista completa: {name}!',
    titleFallback: 'Era conquistada!',
    body: {
      one: 'A seguir: {next}. O Premium libera mais {count} era e {stages} fases da história.',
      other: 'A seguir: {next}. O Premium libera mais {count} eras e {stages} fases da história.',
    },
    bodyFallback: 'Tem muito mais história te esperando com o Premium.',
    unlock: 'Liberar todas as eras',
    notNow: 'Agora não',
  },
} satisfies Translation['paywall'];
