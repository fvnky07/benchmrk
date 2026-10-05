import Charts
import ExpoModulesCore
import SwiftUI
import UIKit

public final class StackedSegment: Record {
  @Field public var label: String = ""
  @Field public var value: Double = 0
  @Field public var color: UIColor = .systemGray

  public required init() {}
}

public final class StackedBar: Record {
  @Field public var label: String = ""
  @Field public var segments: [StackedSegment] = []

  public required init() {}
}

public final class StackedBarChartProps: ExpoSwiftUI.ViewProps {
  @Field var bars: [StackedBar] = []
  @Field var horizontal: Bool = false
}

public struct StackedBarChartView: ExpoSwiftUI.View {
  @ObservedObject public var props: StackedBarChartProps

  public init(props: StackedBarChartProps) {
    self.props = props
  }

  public var body: some View {
    Chart {
      ForEach(props.bars.indices, id: \.self) { barIndex in
        let bar = props.bars[barIndex]
        ForEach(bar.segments.indices, id: \.self) { segmentIndex in
          let segment = bar.segments[segmentIndex]
          if props.horizontal {
            BarMark(
              x: .value("Value", segment.value),
              y: .value("Bar", bar.label)
            )
            .foregroundStyle(Color(uiColor: segment.color))
          } else {
            BarMark(
              x: .value("Bar", bar.label),
              y: .value("Value", segment.value)
            )
            .foregroundStyle(Color(uiColor: segment.color))
          }
        }
      }
    }
    .chartXAxis(props.horizontal && props.bars.count == 1 ? .hidden : .automatic)
    .chartYAxis(props.horizontal && props.bars.count == 1 ? .hidden : .automatic)
    .chartLegend(.hidden)
    .accessibilityHidden(true)
  }
}
