package expo.modules.benchmrkui

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BenchmrkUIModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BenchmrkUI")

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

    View<ChartProps>("ChartView") {
      Content { props -> ChartContent(props) }
    }
  }
}
