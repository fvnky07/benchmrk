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
  var onTap = EventDispatcher()
  var onLongPress = EventDispatcher()
  var onSwipe = EventDispatcher()
  var onAction = EventDispatcher()
}

/**
 * Hosts Expo UI children with the gestures Expo UI doesn't expose on iOS:
 * a horizontal swipe (direction 1 = right, -1 = left) next to tap and
 * long-press. VoiceOver gets the label and the named actions instead.
 */
public struct GestureBoxView: ExpoSwiftUI.View {
  @ObservedObject public var props: GestureBoxViewProps

  private let swipeDistance: CGFloat = 32

  public init(props: GestureBoxViewProps) {
    self.props = props
  }

  public var body: some View {
    let base = Children()
      .contentShape(Rectangle())
      .onTapGesture { props.onTap() }
      .onLongPressGesture { props.onLongPress() }
      .simultaneousGesture(
        DragGesture(minimumDistance: 12).onEnded { value in
          if value.translation.width >= swipeDistance {
            props.onSwipe(["direction": 1])
          } else if value.translation.width <= -swipeDistance {
            props.onSwipe(["direction": -1])
          }
        }
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
  }
}
