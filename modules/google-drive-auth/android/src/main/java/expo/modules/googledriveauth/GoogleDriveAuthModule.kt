package expo.modules.googledriveauth

import android.app.Activity
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.AuthorizationResult
import com.google.android.gms.auth.api.identity.ClearTokenRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.Scope
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Google Drive sign-in on the phone (1.0.80.6). Play services' own
// AuthorizationClient shows Google's account and consent sheet and hands back
// an access token for drive.file, which reaches only the files Lifestead
// itself made. Google matches the app to its client by package name and
// signing certificate, so no client id or secret is in the app.
//
// authorize(false) never shows a sheet: it answers with a token when the
// grant still stands and null when Google wants the person asked again,
// which is how lib/googleDriveAuth.ts renews the hour-long token quietly.
class GoogleDriveAuthModule : Module() {
  private var pending: Promise? = null

  private fun request(): AuthorizationRequest =
    AuthorizationRequest.builder()
      .setRequestedScopes(listOf(Scope(DRIVE_FILE)))
      .build()

  private fun answer(result: AuthorizationResult): Map<String, Any?>? {
    val token = result.accessToken ?: return null
    return mapOf("accessToken" to token, "email" to null)
  }

  override fun definition() = ModuleDefinition {
    Name("GoogleDriveAuth")

    AsyncFunction("authorize") { interactive: Boolean, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_NO_ACTIVITY", "Lifestead is not in front, so Google cannot ask.", null)
        return@AsyncFunction
      }
      Identity.getAuthorizationClient(activity)
        .authorize(request())
        .addOnSuccessListener { result ->
          val intent = result.pendingIntent
          if (!result.hasResolution() || intent == null) {
            promise.resolve(answer(result))
            return@addOnSuccessListener
          }
          if (!interactive) {
            promise.resolve(null)
            return@addOnSuccessListener
          }
          // Only one sheet at a time; an earlier one still open is closed off.
          pending?.resolve(null)
          pending = promise
          try {
            activity.startIntentSenderForResult(intent.intentSender, REQUEST_CODE, null, 0, 0, 0, null)
          } catch (error: Exception) {
            pending = null
            promise.reject("ERR_SHEET", error.message ?: "Google's sheet could not be opened.", error)
          }
        }
        .addOnFailureListener { error ->
          promise.reject("ERR_AUTHORIZE", error.message ?: "Google did not finish the sign-in.", error)
        }
    }

    AsyncFunction("clearToken") { token: String, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(null)
        return@AsyncFunction
      }
      Identity.getAuthorizationClient(context)
        .clearToken(ClearTokenRequest.builder().setToken(token).build())
        .addOnSuccessListener { promise.resolve(null) }
        .addOnFailureListener { promise.resolve(null) }
    }

    OnActivityResult { activity, payload ->
      if (payload.requestCode != REQUEST_CODE) return@OnActivityResult
      val waiting = pending ?: return@OnActivityResult
      pending = null
      if (payload.resultCode != Activity.RESULT_OK || payload.data == null) {
        waiting.resolve(null)
        return@OnActivityResult
      }
      try {
        val result = Identity.getAuthorizationClient(activity).getAuthorizationResultFromIntent(payload.data)
        waiting.resolve(answer(result))
      } catch (error: Exception) {
        waiting.reject("ERR_AUTHORIZE", error.message ?: "Google did not finish the sign-in.", error)
      }
    }
  }

  companion object {
    private const val DRIVE_FILE = "https://www.googleapis.com/auth/drive.file"
    private const val REQUEST_CODE = 46_051
  }
}
