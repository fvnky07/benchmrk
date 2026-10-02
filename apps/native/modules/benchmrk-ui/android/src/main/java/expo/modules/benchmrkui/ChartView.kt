package expo.modules.benchmrkui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.views.ComposeProps
import expo.modules.kotlin.views.FunctionalComposableScope

// Records keep the chart contract identical across the JS-to-Compose boundary.
data class ChartSegmentRecord(
  @Field val label: String = "",
  @Field val value: Double = 0.0,
  @Field val tone: String = "accent"
) : Record

data class ChartBar(
  @Field val label: String = "",
  @Field val segments: List<ChartSegmentRecord> = emptyList()
) : Record

data class ChartPointRecord(
  @Field val label: String = "",
  @Field val value: Double = 0.0
) : Record

data class ChartProps(
  val kind: String = "bar",
  val horizontal: Boolean = false,
  val bars: List<ChartBar> = emptyList(),
  val points: List<ChartPointRecord> = emptyList(),
  val tone: String = "accent",
  val referenceValue: Double? = null,
  val summary: String = ""
) : ComposeProps

/** Dependency-free first-release charts; the surrounding Host supplies height. */
@Composable
fun FunctionalComposableScope.ChartContent(props: ChartProps) {
  val colors = MaterialTheme.colorScheme
  val plotPath = remember { Path() }
  val barTotals = remember(props.bars) {
    DoubleArray(props.bars.size) { index ->
      props.bars[index].segments.sumOf { it.value.coerceAtLeast(0.0) }
    }
  }
  val maxBarTotal = remember(barTotals) { barTotals.maxOrNull() ?: 0.0 }
  val range = remember(props.points, props.referenceValue) {
    var minimum = 0.0
    var maximum = 0.0
    for (point in props.points) {
      minimum = minOf(minimum, point.value)
      maximum = maxOf(maximum, point.value)
    }
    props.referenceValue?.let { reference ->
      minimum = minOf(minimum, reference)
      maximum = maxOf(maximum, reference)
    }
    minimum to if (maximum > minimum) maximum else minimum + 1.0
  }
  val referenceDash = remember { PathEffect.dashPathEffect(floatArrayOf(8f, 6f)) }
  val horizontalStack = props.kind == "stackedBar" && props.horizontal
  val categoryCount = if (props.kind == "stackedBar") props.bars.size else props.points.size
  val showLabels = !horizontalStack && categoryCount in 1..12

  Column(
    Modifier
      .fillMaxSize()
      .semantics(mergeDescendants = true) { contentDescription = props.summary }
  ) {
    Canvas(
      Modifier
        .fillMaxWidth()
        .weight(1f)
        .height(if (horizontalStack) 28.dp else 180.dp)
        .clearAndSetSemantics {}
    ) {
      if (size.width <= 0f || size.height <= 0f) return@Canvas
      when (props.kind) {
        "stackedBar" -> drawStackedBars(props, colors, barTotals, maxBarTotal, plotPath)
        "trend" -> drawTrend(props, colors, range.first, range.second, plotPath, referenceDash)
        "bar" -> drawBars(props.points, colors.chartTone(props.tone), range.first, range.second)
      }
    }
    if (showLabels) {
      Row(Modifier.fillMaxWidth().clearAndSetSemantics {}) {
        repeat(categoryCount) { index ->
          Text(
            text = if (props.kind == "stackedBar") props.bars[index].label else props.points[index].label,
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.labelSmall,
            color = colors.onSurfaceVariant,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
        }
      }
    }
  }
}

private fun ColorScheme.chartTone(tone: String): Color = when (tone) {
  "secondary" -> secondary
  "tertiary" -> tertiary
  "neutral" -> outline
  else -> primary
}

private fun DrawScope.drawStackedBars(
  props: ChartProps,
  colors: ColorScheme,
  totals: DoubleArray,
  maximum: Double,
  clip: Path
) {
  if (props.bars.isEmpty() || maximum <= 0.0) return
  val count = props.bars.size
  val slot = if (props.horizontal) size.height / count else size.width / count
  val gap = if (props.horizontal && count == 1) 0f else minOf(6.dp.toPx(), slot * 0.2f)
  val thickness = slot - gap
  val radius = minOf(4.dp.toPx(), thickness / 2f)

  props.bars.forEachIndexed { index, bar ->
    val total = totals[index]
    if (total <= 0.0) return@forEachIndexed
    val extent = ((total / maximum) * if (props.horizontal) size.width else size.height).toFloat()
    val left = if (props.horizontal) 0f else slot * index + gap / 2f
    val top = if (props.horizontal) slot * index + gap / 2f else size.height - extent
    val width = if (props.horizontal) extent else thickness
    val height = if (props.horizontal) thickness else extent
    clip.reset()
    clip.addRoundRect(
      RoundRect(Rect(left, top, left + width, top + height), CornerRadius(radius, radius))
    )
    clipPath(clip) {
      var consumed = 0.0
      for (segment in bar.segments) {
        val value = segment.value.coerceAtLeast(0.0)
        if (value == 0.0) continue
        val start = ((consumed / maximum) * if (props.horizontal) size.width else size.height).toFloat()
        consumed += value
        val end = ((consumed / maximum) * if (props.horizontal) size.width else size.height).toFloat()
        drawRect(
          color = colors.chartTone(segment.tone),
          topLeft = if (props.horizontal) Offset(start, top) else Offset(left, size.height - end),
          size = if (props.horizontal) Size(end - start, height) else Size(width, end - start)
        )
      }
    }
  }
}

private fun DrawScope.drawBars(
  points: List<ChartPointRecord>,
  color: Color,
  minimum: Double,
  maximum: Double
) {
  if (points.isEmpty()) return
  val slot = size.width / points.size
  val gap = minOf(6.dp.toPx(), slot * 0.2f)
  val span = maximum - minimum
  val zeroY = size.height * (maximum / span).toFloat()
  points.forEachIndexed { index, point ->
    val pointY = size.height * ((maximum - point.value) / span).toFloat()
    drawRect(
      color = color,
      topLeft = Offset(slot * index + gap / 2f, minOf(zeroY, pointY)),
      size = Size(slot - gap, kotlin.math.abs(pointY - zeroY))
    )
  }
}

private fun DrawScope.drawTrend(
  props: ChartProps,
  colors: ColorScheme,
  minimum: Double,
  maximum: Double,
  path: Path,
  dash: PathEffect
) {
  val radius = minOf(3.dp.toPx(), size.width / 2f, size.height / 2f)
  val plotWidth = (size.width - radius * 2f).coerceAtLeast(0f)
  val plotHeight = (size.height - radius * 2f).coerceAtLeast(0f)
  val span = maximum - minimum
  val count = props.points.size
  val slot = if (count > 0) size.width / count else 0f
  val firstX = if (count > 1) maxOf(radius, slot / 2f) else size.width / 2f
  val lastX = if (count > 1) minOf(size.width - radius, size.width - slot / 2f) else firstX
  val color = colors.chartTone(props.tone)

  props.referenceValue?.let { reference ->
    val y = radius + plotHeight * ((maximum - reference) / span).toFloat()
    drawLine(
      color = colors.outline,
      start = Offset(radius, y),
      end = Offset(radius + plotWidth, y),
      strokeWidth = 1.dp.toPx(),
      pathEffect = dash
    )
  }
  if (count == 0) return

  path.reset()
  props.points.forEachIndexed { index, point ->
    val x = if (count == 1) firstX else firstX + (lastX - firstX) * index / (count - 1)
    val y = radius + plotHeight * ((maximum - point.value) / span).toFloat()
    if (index == 0) path.moveTo(x, y) else path.lineTo(x, y)
    drawCircle(color, radius, Offset(x, y))
  }
  drawPath(path, color, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))
}
