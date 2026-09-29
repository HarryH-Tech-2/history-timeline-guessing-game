import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Per-profile app identity so the development, preview and production builds
 * can sit side by side on one device. `eas.json` sets EXPO_PUBLIC_APP_ENV for
 * the development and preview profiles; production leaves it unset and keeps
 * the store identity from app.json untouched.
 *
 * Only the Android package changes — the iOS bundle id stays on the store id
 * until the GoogleService-Info.plist has matching variant apps.
 *
 * Each variant package must also be registered as an Android app in Firebase
 * (and present in google-services.json), or the Gradle google-services step
 * fails with "No matching client found for package name".
 */
const VARIANTS = {
  development: { suffix: '.dev', label: 'Dev', scheme: 'chronos-dev' },
  preview: { suffix: '.preview', label: 'Preview', scheme: 'chronos-preview' },
} as const;

/** Hosting domain that serves the /c/ (challenge) and /g/ (group) invite pages. */
const LINK_HOST = 'history-date-timeline-guesser.web.app';

/**
 * Android App Links for invite URLs, on every variant. Verification needs each
 * package's signing SHA-256 in web/.well-known/assetlinks.json. iOS universal
 * links are deliberately left out until there is an Apple Team ID and AASA file.
 */
const withLinks = (config: ExpoConfig): ExpoConfig => ({
  ...config,
  android: {
    ...config.android,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: LINK_HOST, pathPrefix: '/c/' },
          { scheme: 'https', host: LINK_HOST, pathPrefix: '/g/' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  const variant = env === 'development' || env === 'preview' ? VARIANTS[env] : null;
  if (!variant) return withLinks(config as ExpoConfig);

  return withLinks({
    ...config,
    name: `${config.name} (${variant.label})`,
    scheme: variant.scheme,
    android: {
      ...config.android,
      package: `${config.android?.package}${variant.suffix}`,
    },
  } as ExpoConfig);
};
