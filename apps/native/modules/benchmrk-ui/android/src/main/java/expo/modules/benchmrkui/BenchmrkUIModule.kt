package expo.modules.benchmrkui

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ComposeProps
import expo.modules.kotlin.views.FunctionalComposableScope
import expo.modules.ui.UIComposableScope
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

data class SwipeRowProps(
  val canComplete: Boolean = true,
  val canDelete: Boolean = true
) : ComposeProps

private val ACTION_WIDTH = 104.dp
private val COMPLETE_DISTANCE = 96.dp

/**
 * A Set row for Expo UI on Android, where Compose's SwipeToDismissBox can't
 * leave actions revealed: swipe right completes (unlogged Sets), swipe left
 * reveals Duplicate and Delete, and a full left swipe duplicates. TalkBack
 * gets the same actions as custom actions.
 */
class BenchmrkUIModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BenchmrkUI")

    View<SwipeRowProps>("SwipeRowView") {
      val onComplete by Event<Unit>()
      val onDuplicate by Event<Unit>()
      val onDelete by Event<Unit>()

      Content { props ->
        SwipeRowContent(
          props,
          onComplete = { onComplete(Unit) },
          onDuplicate = { onDuplicate(Unit) },
          onDelete = { onDelete(Unit) }
        )
      }
    }

    View<GestureBoxProps>("GestureBoxView") {
      val onTap by Event<Unit>()
      val onLongPress by Event<Unit>()
      val onSwipe by Event<GestureBoxSwipe>()
      val onAction by Event<GestureBoxActionEvent>()

      Content { props ->
        GestureBoxContent(
          props,
          onTap = { onTap(Unit) },
          onLongPress = { onLongPress(Unit) },
          onSwipe = { direction -> onSwipe(GestureBoxSwipe(direction)) },
          onAction = { id -> onAction(GestureBoxActionEvent(id)) }
        )
      }
    }
  }
}

@Composable
fun FunctionalComposableScope.SwipeRowContent(
  props: SwipeRowProps,
  onComplete: () -> Unit,
  onDuplicate: () -> Unit,
  onDelete: () -> Unit
) {
  val density = LocalDensity.current
  val scope = rememberCoroutineScope()
  val offset = remember { Animatable(0f) }
  var width by remember { mutableIntStateOf(0) }
  val actionCount = if (props.canDelete) 2 else 1
  val revealPx = with(density) { (ACTION_WIDTH * actionCount).toPx() }
  val completePx = with(density) { COMPLETE_DISTANCE.toPx() }
  val fullSwipePx = maxOf(revealPx * 1.5f, width * 0.6f)

  fun settle(target: Float) {
    scope.launch { offset.animateTo(target) }
  }

  Box(
    Modifier
      .fillMaxWidth()
      .onSizeChanged { width = it.width }
      .semantics {
        customActions = buildList {
          if (props.canComplete) {
            add(CustomAccessibilityAction("Complete") { onComplete(); true })
          }
          add(CustomAccessibilityAction("Duplicate") { onDuplicate(); true })
          if (props.canDelete) {
            add(CustomAccessibilityAction("Delete") { onDelete(); true })
          }
        }
      }
  ) {
    Row(Modifier.matchParentSize(), verticalAlignment = Alignment.CenterVertically) {
      Box(
        Modifier
          .weight(1f)
          .fillMaxHeight()
          .background(
            if (offset.value > 0f) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface
          ),
        contentAlignment = Alignment.CenterStart
      ) {
        if (offset.value > 0f) {
          Text(
            "Complete",
            modifier = Modifier.padding(start = 16.dp),
            color = MaterialTheme.colorScheme.onPrimaryContainer
          )
        }
      }
      if (offset.value < 0f) {
        TextButton(
          onClick = { onDuplicate(); settle(0f) },
          modifier = Modifier.width(ACTION_WIDTH).fillMaxHeight()
        ) { Text("Duplicate") }
        if (props.canDelete) {
          TextButton(
            onClick = { onDelete(); settle(0f) },
            colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.width(ACTION_WIDTH).fillMaxHeight()
          ) { Text("Delete") }
        }
      }
    }
    Box(
      Modifier
        .offset { IntOffset(offset.value.roundToInt(), 0) }
        .background(MaterialTheme.colorScheme.surface)
        .draggable(
          orientation = Orientation.Horizontal,
          state = rememberDraggableState { delta ->
            scope.launch {
              val maxRight = if (props.canComplete) width.toFloat() else 0f
              offset.snapTo((offset.value + delta).coerceIn(-width.toFloat(), maxRight))
            }
          },
          onDragStopped = {
            val value = offset.value
            when {
              value >= completePx -> {
                onComplete()
                offset.animateTo(0f)
              }
              value <= -fullSwipePx -> {
                onDuplicate()
                offset.animateTo(0f)
              }
              value <= -revealPx / 2 -> offset.animateTo(-revealPx)
              else -> offset.animateTo(0f)
            }
          }
        )
    ) {
      Children(UIComposableScope())
    }
  }
}
