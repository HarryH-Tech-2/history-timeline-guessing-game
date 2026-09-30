/** Sign-in, account deletion and the sign-in errors shown on those screens. */
export const account = {
  somethingWrong: 'Something went wrong.',
  signIn: {
    title: 'Sign in',
    offline:
      'Accounts need a connection and are not available in this build. Your progress is saved on this device.',
    backupTitle: 'Back up your progress',
    backupBody:
      'Optional. Back up to {providers} and your progress follows you to a new phone. Everything you’ve earned so far carries over.',
    switchTitle: 'Switch account',
    switchBody: 'Sign in with a different account.',
    benefits: {
      devices: 'Your progress, museum and campaign follow you to any device.',
      name: 'Your name on the global leaderboard stays yours.',
      oneTap: 'One tap — no password to remember.',
    },
    google: 'Continue with Google',
    working: 'Working…',
    /** {store} is the short store name: "Google Play" / "App Store". */
    purchasesNote:
      'Premium purchases are tied to your {store} account, not to a sign-in. You can buy and restore Premium without an account.',
  },
  delete: {
    title: 'Delete account',
    guest:
      'You are playing as a guest, so there is no account to delete. Uninstalling the app removes your on-device progress.',
    offline: 'Accounts are not available in this build.',
    signedInAs: 'Signed in as {name}',
    willDelete: 'This will permanently delete',
    items: {
      signIn: 'Your sign-in link. You will not be able to sign in to it again.',
      cloud: 'Cloud saves: XP, level, coins, hearts, museum, campaign progress and best scores.',
      leaderboard: 'Your row on the global leaderboard.',
      device: 'The copy of that progress on this device.',
    },
    /** {store}: store name mid-sentence. {where}: "in your Play subscriptions" (carries its own "in"). */
    purchasesNote:
      'Purchases are managed by {store} and are not affected. An active Premium subscription must be cancelled separately {where}.',
    passwordPlaceholder: 'Confirm your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    show: 'Show',
    hide: 'Hide',
    enterPassword: 'Enter your password to confirm.',
    submit: 'Delete my account',
    deleting: 'Deleting…',
    confirmTitle: 'Delete your account?',
    confirmBody: 'This permanently removes your account and all of its progress. It cannot be undone.',
    confirmButton: 'Delete',
  },
  errors: {
    offline: 'Accounts need a connection and are not available in this build.',
    alreadyLinked: 'That account is already linked to another player.',
    wrongPassword: 'Email or password is incorrect.',
    recentLogin: 'Please sign in again before deleting your account.',
    tooMany: 'Too many attempts — wait a moment and try again.',
    network: 'No connection — check your network and try again.',
    failed: 'Sign-in failed. Please try again.',
    enterPassword: 'Enter your password to continue.',
    appleCancelled: 'Sign in with Apple was cancelled.',
    googleCancelled: 'Google sign-in was cancelled.',
    noToken: 'Google sign-in did not return a token.',
    noAccount: 'No account is signed in.',
    playGames: 'Could not verify your Play Games sign-in. Try again.',
    cannotVerify: 'This account cannot be verified from the app.',
  },
};
