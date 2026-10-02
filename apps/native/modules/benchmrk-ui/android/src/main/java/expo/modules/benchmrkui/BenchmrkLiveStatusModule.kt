package expo.modules.benchmrkui

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

data class LiveStatusRecord(
  @Field val startedAt: Double = 0.0,
  @Field val setsDone: Int = 0,
  @Field val setsPlanned: Int = 0,
  @Field val restEndsAt: Double? = null,
  @Field val url: String = ""
) : Record

/** Shows and clears the Workout's ongoing notification (Android's live status). */
class BenchmrkLiveStatusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BenchmrkLiveStatus")

    Function("show") { status: LiveStatusRecord ->
      val context = appContext.reactContext ?: return@Function
      WorkoutLiveStatus.show(
        context,
        WorkoutStatus(
          startedAt = status.startedAt.toLong(),
          setsDone = status.setsDone,
          setsPlanned = status.setsPlanned,
          restEndsAt = status.restEndsAt?.toLong(),
          url = status.url
        )
      )
    }

    Function("clear") {
      val context = appContext.reactContext ?: return@Function null
      WorkoutLiveStatus.clear(context)
    }
  }
}
