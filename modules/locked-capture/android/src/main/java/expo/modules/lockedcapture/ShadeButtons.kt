package expo.modules.lockedcapture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import java.io.File

// The Capture buttons kept in the notification shade (1.0.62.1). Direct
// request, 2026-10-05: "tap a button on a notification you keep in the
// shade, enter your Inside Story code, speak, and it saves."
//
// One notification per button, each opened by a tap on itself, rather than one with
// two buttons (2026-10-07). Samsung's shade sends every press of a
// notification BUTTON that opens a screen through the phone's unlock
// first, whatever that screen allows; a tap on the notification itself goes
// straight to a screen that may show over the lock screen. Seen in the
// phone's log as dismissKeyguardThenExecute on each button press.
//
// Where a tap goes (2026-10-12). Voice Note and Photo with App Lock on open
// CaptureLauncherActivity, written into the app by plugins/withCaptureTile.js,
// which shows the capture screen over the lock screen when the phone is
// locked and goes straight into Capture when it is not. Voice Control
// always, and Voice Note and Photo with App Lock off, open the app itself.
// The app cannot show over the lock screen, so the shade asks for the
// phone's unlock first, the way it does for any other app's notification.
// Reported 2026-10-12: Voice Control pressed on a locked phone showed the
// lock screen with no keypad and then nothing, because the launcher's own
// request for the unlock was dropped. Which target a button carries is
// settled when it is posted, and the app posts the buttons again on every
// start, which is when a change to App Lock takes effect.
//
// Each button has a switch of its own (2026-10-12). Direct request: "Where
// are voice note and photo turned off? I don't see it anywhere." Before this
// one switch posted all three, kept under KEY_ON, which still reads as the
// answer for any button that has no switch of its own yet.
// The notifications carry no words from anybody's records, so they are safe
// to show on the lock screen.
object ShadeButtons {
  private const val PREFS = "inside_story_locked_capture"
  private const val KEY_ON = "shade_buttons"
  private const val CHANNEL_ID = "capture-buttons"
  const val ACTION_DISMISSED = "expo.modules.lockedcapture.SHADE_BUTTONS_DISMISSED"
  const val EXTRA_KIND = "kind"

  private class Button(
    val kind: String,
    val id: Int,
    val requestCode: Int,
    val dismissCode: Int,
    val icon: String,
    val title: String,
    val text: String,
  )

  // Request codes 1, 2 and 4 are the taps and 3 was the one dismissal, as
  // before; each button's dismissal now has a code of its own.
  private val BUTTONS = listOf(
    Button("voice", 61016, 1, 5, "ic_tile_voice", "Voice Note", "Tap to say a note into Capture."),
    Button("photo", 61017, 2, 6, "ic_tile_photo", "Photo", "Tap to take a photo into Capture."),
    Button("command", 61018, 4, 7, "ic_tile_command", "Voice Control", "Tap to unlock and give a command."),
  )

  private fun button(kind: String): Button? = BUTTONS.firstOrNull { it.kind == kind }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isOn(context: Context, kind: String): Boolean =
    prefs(context).getBoolean("shade_$kind", prefs(context).getBoolean(KEY_ON, false))

  /** Whether any button is wanted. */
  fun isOn(context: Context): Boolean = BUTTONS.any { isOn(context, it.kind) }

  private fun setOn(context: Context, kind: String, on: Boolean) {
    prefs(context).edit().putBoolean("shade_$kind", on).apply()
  }

  // Each version of the app has its own link scheme (app.config.js), written
  // by plugins/withCaptureTile.js as the lifestead_scheme string.
  private fun scheme(context: Context): String {
    val id = context.resources.getIdentifier("lifestead_scheme", "string", context.packageName)
    return if (id != 0) context.getString(id) else "hashimotosapp"
  }

  private fun appLockOn(context: Context) = File(context.filesDir, "app-lock.json").exists()

  private fun target(context: Context, b: Button): PendingIntent {
    val intent = if (b.kind == "command" || !appLockOn(context)) {
      val path = when (b.kind) {
        "command" -> "voice-control"
        "photo" -> "capture?photo=1"
        else -> "capture?speak=1"
      }
      Intent(Intent.ACTION_VIEW, Uri.parse("${scheme(context)}://$path")).apply {
        setPackage(context.packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    } else {
      Intent().apply {
        setClassName(context, "${context.packageName}.CaptureLauncherActivity")
        putExtra("mode", b.kind)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    }
    return PendingIntent.getActivity(
      context, b.requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  private fun drawable(context: Context, name: String, fallback: Int): Int {
    val id = context.resources.getIdentifier(name, "drawable", context.packageName)
    return if (id != 0) id else fallback
  }

  private fun post(context: Context, manager: NotificationManager, b: Button) {
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Capture buttons", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Voice Note, Photo and Voice Control buttons kept in the shade."
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
    )
    val small = drawable(context, "notification_icon", android.R.drawable.ic_btn_speak_now)
    val dismissed = PendingIntent.getBroadcast(
      context, b.dismissCode,
      Intent(context, ShadeButtonsReceiver::class.java).setAction(ACTION_DISMISSED).putExtra(EXTRA_KIND, b.kind),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    val notification = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(drawable(context, b.icon, small))
      .setContentTitle(b.title)
      .setContentText(b.text)
      .setContentIntent(target(context, b))
      .setDeleteIntent(dismissed)
      .setOngoing(true)
      .setShowWhen(false)
      .setOnlyAlertOnce(true)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      // A group of its own keeps Android from folding it in with the
      // reminders, where it would sit one tap further away.
      .setGroup("inside-story-capture-${b.kind}")
      .build()
    manager.notify(b.id, notification)
  }

  private fun manager(context: Context) =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** Posts one button and remembers it is wanted. False when Android will not show it. */
  fun show(context: Context, kind: String): Boolean {
    val b = button(kind) ?: return false
    val manager = manager(context)
    if (!manager.areNotificationsEnabled()) return false
    setOn(context, kind, true)
    post(context, manager, b)
    return true
  }

  /** All three at once, which is what a build before 2026-10-12 offered. */
  fun show(context: Context): Boolean = BUTTONS.map { show(context, it.kind) }.all { it }

  fun hide(context: Context, kind: String) {
    val b = button(kind) ?: return
    setOn(context, kind, false)
    manager(context).cancel(b.id)
  }

  fun hide(context: Context) = BUTTONS.forEach { hide(context, it.kind) }

  /** Posts again every button that is wanted, so each carries today's target. */
  fun repost(context: Context) {
    val manager = manager(context)
    if (!manager.areNotificationsEnabled()) return
    BUTTONS.filter { isOn(context, it.kind) }.forEach { post(context, manager, it) }
  }

  /** Whether the button is in the shade now, rather than only wanted. */
  fun isShowing(context: Context, kind: String): Boolean {
    val b = button(kind) ?: return false
    if (!isOn(context, kind)) return false
    return manager(context).activeNotifications.any { it.id == b.id }
  }

  fun isShowing(context: Context): Boolean = BUTTONS.any { isShowing(context, it.kind) }

  /** Swiped away (Android 14 and later allow it): no longer wanted, so its switch reads off. */
  fun dismissed(context: Context, kind: String?) {
    if (kind == null) BUTTONS.forEach { setOn(context, it.kind, false) } else setOn(context, kind, false)
  }
}

class ShadeButtonsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ShadeButtons.ACTION_DISMISSED -> ShadeButtons.dismissed(context, intent.getStringExtra(ShadeButtons.EXTRA_KIND))
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
        ShadeButtons.repost(context)
        EmergencyNotice.restore(context)
      }
    }
  }
}
