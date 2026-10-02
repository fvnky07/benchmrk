package expo.modules.benchmrkui

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle

/** What the live status shows: never an Exercise or Routine name. */
data class WorkoutStatus(
  val startedAt: Long,
  val setsDone: Int,
  val setsPlanned: Int,
  /** When resting, the rest end; null otherwise. */
  val restEndsAt: Long?,
  /** Where a tap goes: the active Workout. */
  val url: String
)

/**
 * The Workout's ongoing notification: the rest countdown while resting,
 * otherwise elapsed time and Sets done. No buttons; a tap opens the Workout.
 * On Android 16 it asks to be promoted to a Live Update.
 */
object WorkoutLiveStatus {
  private const val CHANNEL_ID = "workout-live-status"
  private const val NOTIFICATION_ID = 7301
  private const val PREFS = "benchmrk-live-status"
  private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

  fun show(context: Context, status: WorkoutStatus) {
    save(context, status)
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    ensureChannel(context, manager)
    val restEndsAt = status.restEndsAt?.takeIf { it > System.currentTimeMillis() }
    val sets = "${status.setsDone} of ${status.setsPlanned} Sets"

    val builder = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(if (restEndsAt != null) "Rest" else "Workout")
      .setContentText(sets)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setChronometerCountDown(restEndsAt != null)
      .setWhen(restEndsAt ?: status.startedAt)
      .setContentIntent(openWorkout(context, status.url))
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setCategory(Notification.CATEGORY_STOPWATCH)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
      // What NotificationCompat.setRequestPromotedOngoing sets: ask for a Live Update.
      builder.addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
      builder.setShortCriticalText(
        if (restEndsAt != null) "Rest" else "${status.setsDone}/${status.setsPlanned}"
      )
    }
    manager.notify(NOTIFICATION_ID, builder.build())
    scheduleRestEnd(context, restEndsAt)
  }

  fun clear(context: Context) {
    context.getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
    scheduleRestEnd(context, null)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  /** Rest ended without the app: back to elapsed time and Sets done. */
  internal fun showAfterRest(context: Context) {
    load(context)?.let { show(context, it.copy(restEndsAt = null)) }
  }

  private fun ensureChannel(context: Context, manager: NotificationManager) {
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    manager.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Workout status", NotificationManager.IMPORTANCE_LOW).apply {
        description = "Rest countdown, elapsed time and Sets done while a Workout runs"
        setShowBadge(false)
      }
    )
  }

  private fun openWorkout(context: Context, url: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      NOTIFICATION_ID,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
  }

  /** An inexact alarm when rest ends; it only matters while the screen is on. */
  private fun scheduleRestEnd(context: Context, at: Long?) {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = PendingIntent.getBroadcast(
      context,
      NOTIFICATION_ID,
      Intent(context, RestEndReceiver::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    alarms.cancel(intent)
    if (at != null) alarms.set(AlarmManager.RTC, at, intent)
  }

  private fun save(context: Context, status: WorkoutStatus) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putLong("startedAt", status.startedAt)
      .putInt("setsDone", status.setsDone)
      .putInt("setsPlanned", status.setsPlanned)
      .putString("url", status.url)
      .apply()
  }

  private fun load(context: Context): WorkoutStatus? {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val url = prefs.getString("url", null) ?: return null
    return WorkoutStatus(
      startedAt = prefs.getLong("startedAt", 0),
      setsDone = prefs.getInt("setsDone", 0),
      setsPlanned = prefs.getInt("setsPlanned", 0),
      restEndsAt = null,
      url = url
    )
  }
}

/** Switches the live status back to elapsed time when rest ends. */
class RestEndReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    WorkoutLiveStatus.showAfterRest(context)
  }
}
