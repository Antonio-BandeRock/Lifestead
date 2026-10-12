package expo.modules.lockedcapture

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// What the JavaScript side needs for capturing over the lock screen
// (1.0.62.1): closing the capture screen when it is done, and the
// shade buttons' switch in Profile.
class LockedCaptureModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("LockedCapture")

    // Only ever closes the lock screen capture activity, never the app.
    Function("finishCapture") {
      val activity = appContext.currentActivity
      if (activity != null && activity.javaClass.simpleName == "LockedCaptureActivity") activity.finish()
    }

    Function("showShadeButtons") { ShadeButtons.show(context) }

    Function("hideShadeButtons") { ShadeButtons.hide(context) }

    Function("isShowingShadeButtons") { ShadeButtons.isShowing(context) }

    // One button at a time (2026-10-12), so each has a switch of its own.
    // kind is "voice", "photo" or "command".
    Function("showShadeButton") { kind: String -> ShadeButtons.show(context, kind) }

    Function("hideShadeButton") { kind: String -> ShadeButtons.hide(context, kind) }

    Function("isShowingShadeButton") { kind: String -> ShadeButtons.isShowing(context, kind) }

    // Posts again what is wanted, so each button carries the target that
    // suits App Lock as it is now.
    Function("repostShadeButtons") { ShadeButtons.repost(context) }

    Function("showEmergencyNotice") { title: String, body: String -> EmergencyNotice.show(context, title, body) }

    Function("hideEmergencyNotice") { EmergencyNotice.hide(context) }

    // Said true by a build whose flare questions open the words screen over
    // the lock screen, so the notification text offers it only then.
    Function("supportsReminderWords") { true }
  }
}
