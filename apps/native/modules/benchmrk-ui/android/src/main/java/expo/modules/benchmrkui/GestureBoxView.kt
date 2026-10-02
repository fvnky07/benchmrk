package expo.modules.benchmrkui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.CustomAccessibilityAction
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.customActions
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.views.ComposeProps
import expo.modules.kotlin.views.FunctionalComposableScope
import expo.modules.ui.UIComposableScope

data class GestureBoxAction(
  @Field val id: String = "",
  @Field val label: String = ""
) : Record

data class GestureBoxProps(
  val label: String = "",
  val actions: List<GestureBoxAction> = emptyList()
) : ComposeProps

data class GestureBoxSwipe(@Field val direction: Int = 0) : Record

data class GestureBoxActionEvent(@Field val id: String = "") : Record

private val SWIPE_DISTANCE = 32.dp

/**
 * Hosts Expo UI children with the gestures Expo UI doesn't expose on Android:
 * tap, long-press and a horizontal swipe (direction 1 = right, -1 = left).
 * Screen readers get the label and the named actions instead.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun FunctionalComposableScope.GestureBoxContent(
  props: GestureBoxProps,
  onTap: () -> Unit,
  onLongPress: () -> Unit,
  onSwipe: (Int) -> Unit,
  onAction: (String) -> Unit
) {
  val swipePx = with(LocalDensity.current) { SWIPE_DISTANCE.toPx() }
  var dragged by remember { mutableFloatStateOf(0f) }

  Box(
    Modifier
      .semantics {
        contentDescription = props.label
        customActions = props.actions.map { action ->
          CustomAccessibilityAction(action.label) { onAction(action.id); true }
        }
      }
      .combinedClickable(onClick = onTap, onLongClick = onLongPress)
      .pointerInput(Unit) {
        detectHorizontalDragGestures(
          onDragStart = { dragged = 0f },
          onDragEnd = {
            if (dragged >= swipePx) onSwipe(1)
            if (dragged <= -swipePx) onSwipe(-1)
          },
          onHorizontalDrag = { change, amount ->
            change.consume()
            dragged += amount
          }
        )
      }
  ) {
    Children(UIComposableScope())
  }
}
