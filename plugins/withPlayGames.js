const { AndroidConfig, withAndroidManifest, withStringsXml } = require('expo/config-plugins');

const APP_ID_META = 'com.google.android.gms.games.APP_ID';
const STRING_NAME = 'game_services_project_id';

/**
 * Injects the Play Games Services project id required by
 * com.google.android.gms:play-services-games-v2 (the dependency itself lives
 * in modules/expo-play-games/android/build.gradle).
 *
 * The meta-data value MUST be a @string resource reference — games-v2 rejects
 * an inlined numeric android:value — so this writes both the strings.xml entry
 * and the manifest meta-data pointing at it.
 */
function withPlayGames(config, { appId } = {}) {
  if (!appId) {
    throw new Error(
      'withPlayGames: "appId" (the numeric Play Games Services project id) is required.',
    );
  }

  config = withStringsXml(config, (config) => {
    config.modResults = AndroidConfig.Strings.setStringItem(
      [{ _: String(appId), $: { name: STRING_NAME, translatable: 'false' } }],
      config.modResults,
    );
    return config;
  });

  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      APP_ID_META,
      `@string/${STRING_NAME}`,
    );
    return config;
  });

  return config;
}

module.exports = withPlayGames;
