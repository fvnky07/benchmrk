import ExpoModulesCore
import SwiftUI

public final class GestureBoxAction: Record {
  @Field public var id: String = ""
  @Field public var label: String = ""

  public required init() {}
}

public final class GestureBoxViewProps: ExpoSwiftUI.ViewProps {
  @Field var label: String = ""
  @Field var actions: [GestureBoxAction] = []
  @Field var swipeable: Bool = true
  @Field var longPressable: Bool = true
  var onTap = EventDispatcher()
  var onLongPress = EventDispatcher()
  var onSwipe = EventDispatcher()
  var onAction = EventDispatcher()
}

/**
 * Hosts Expo UI children with the gestures Expo UI doesn't expose on iOS:
 * tap, and when enabled long-press and a horizontal swipe (direction 1 =
 * right, -1 = left). VoiceOver gets the label and the named actions instead.
 */
public struct GestureBoxView: ExpoSwiftUI.View {
  @ObservedObject public var props: GestureBoxViewProps

  private let swipeDistance: CGFloat = 32

  public init(props: GestureBoxViewProps) {
    self.props = props
  }

  public var body: some View {
    let tappable = Children()
      .contentShape(Rectangle())
      .onTapGesture { props.onTap() }
    // A recognized long-press cancels the tap, so only one of them fires.
    let pressable = props.longPressable
      ? AnyView(tappable.onLongPressGesture { props.onLongPress() })
      : AnyView(tappable)
    let base = pressable
      .simultaneousGesture(
        DragGesture(minimumDistance: 12).onEnded { value in
          if value.translation.width >= swipeDistance {
            props.onSwipe(["direction": 1])
          } else if value.translation.width <= -swipeDistance {
            props.onSwipe(["direction": -1])
          }
        },
        including: props.swipeable ? .all : .subviews
      )
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(props.label)
      .accessibilityAddTraits(.isButton)

    props.actions.reduce(AnyView(base)) { view, action in
      AnyView(
        view.accessibilityAction(named: Text(action.label)) {
          props.onAction(["id": action.id])
        }
      )
    }
  }
}

public class BenchmrkUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BenchmrkUI")

    View(GestureBoxView.self)
    View(StackedBarChartView.self)
  }
}
