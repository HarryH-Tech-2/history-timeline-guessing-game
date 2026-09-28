package expo.modules.playgames

import com.google.android.gms.games.PlayGames
import com.google.android.gms.games.PlayGamesSdk
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private class NoActivityException :
  CodedException("ERR_NO_ACTIVITY", "No current Android Activity available", null)

/** Request code for the Play Games achievements overlay; its result is ignored. */
private const val RC_ACHIEVEMENTS_UI = 9003

/**
 * Minimal bridge to the Play Games Services v2 sign-in SDK.
 *
 * Initializing the SDK (OnCreate below) is what arms games-v2's automatic
 * zero-tap sign-in prompt; the functions here only observe or re-trigger it.
 * The APP_ID meta-data this SDK requires is injected by plugins/withPlayGames.
 */
class ExpoPlayGamesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPlayGames")

    OnCreate {
      appContext.reactContext?.applicationContext?.let { PlayGamesSdk.initialize(it) }
    }

    AsyncFunction("isAuthenticated") { promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject(NoActivityException())
        return@AsyncFunction
      }
      PlayGames.getGamesSignInClient(activity).isAuthenticated().addOnCompleteListener { task ->
        promise.resolve(task.isSuccessful && task.result.isAuthenticated)
      }
    }

    AsyncFunction("signIn") { promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject(NoActivityException())
        return@AsyncFunction
      }
      PlayGames.getGamesSignInClient(activity).signIn().addOnCompleteListener { task ->
        promise.resolve(task.isSuccessful && task.result.isAuthenticated)
      }
    }

    // Unlocks an achievement by its Play Console id. `unlockImmediate` reports
    // back (unlike fire-and-forget `unlock`), so JS can remember what took and
    // retry the rest later — e.g. when the player wasn't signed in yet.
    AsyncFunction("unlockAchievement") { achievementId: String, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject(NoActivityException())
        return@AsyncFunction
      }
      PlayGames.getAchievementsClient(activity)
        .unlockImmediate(achievementId)
        .addOnCompleteListener { task ->
          if (task.isSuccessful) {
            promise.resolve(null)
          } else {
            promise.reject(
              CodedException(
                "ERR_UNLOCK_ACHIEVEMENT",
                task.exception?.message ?: "unlockAchievement failed",
                task.exception,
              ),
            )
          }
        }
    }

    // Shows Play Games' own achievements screen as an overlay activity.
    AsyncFunction("showAchievements") { promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject(NoActivityException())
        return@AsyncFunction
      }
      PlayGames.getAchievementsClient(activity)
        .achievementsIntent
        .addOnCompleteListener { task ->
          if (task.isSuccessful) {
            activity.startActivityForResult(task.result, RC_ACHIEVEMENTS_UI)
            promise.resolve(null)
          } else {
            promise.reject(
              CodedException(
                "ERR_SHOW_ACHIEVEMENTS",
                task.exception?.message ?: "showAchievements failed",
                task.exception,
              ),
            )
          }
        }
    }

    // Returns a single-use server auth code for the given web OAuth client id.
    // Unused until there is a backend to exchange it, but exposed now so the
    // JS surface is complete.
    AsyncFunction("requestServerSideAccess") { webClientId: String, promise: Promise ->
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) {
        promise.reject(NoActivityException())
        return@AsyncFunction
      }
      PlayGames.getGamesSignInClient(activity)
        .requestServerSideAccess(webClientId, false)
        .addOnCompleteListener { task ->
          if (task.isSuccessful) {
            promise.resolve(task.result)
          } else {
            promise.reject(
              CodedException(
                "ERR_SERVER_SIDE_ACCESS",
                task.exception?.message ?: "requestServerSideAccess failed",
                task.exception,
              ),
            )
          }
        }
    }
  }
}
