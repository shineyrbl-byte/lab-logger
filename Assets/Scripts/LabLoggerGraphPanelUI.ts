/**
 * LabLoggerGraphPanelUI — the graphs panel that replaces the table after Stop.
 *
 * Owns:   a UIKit BackPlate panel with title, legend, a line chart (axes + tick
 *         labels laid out by FlexLayout; plot lines drawn with MeshBuilder), and
 *         big Previous / Next UIKit Buttons around a "Graph N of 7" label.
 * API:    setRows(rows)       → data to plot (frozen copy of the recorded rows)
 *         showGraph(index)    → render graph index 0..6 (LabLoggerMain decides which)
 *         setVisible(on)
 *         onNextPressed / onPreviousPressed (Event<void>) → user intent
 *         pressNext() / pressPrevious() → programmatic presses (LEAF)
 *         shownGraphIndex, graphCount, currentTitle, pageLabel, plottedPointCount, isVisible
 * Must not: own which graph is current — LabLoggerMain owns currentGraphIndex.
 *
 * Size note (~315 lines): the chart renderer (MeshBuilder line quads) lives here with the
 * panel because it draws into the panel's plot cell; the RenderMeshVisuals are chart
 * geometry, not a hand-rolled panel surface (the surface is a UIKit BackPlate).
 */
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {GRAPH_COUNT, GraphSpec, LogRow, buildGraph, fmtTick, niceRange} from "./LabLoggerData"
import {
  PANEL_CONTENT_Z, buttonLabel, columnText, flexChild, flexColumn, flexRow, iconImage, obj, rowText,
  vec4FromVec3,
} from "./LabLoggerStyleUI"

const ICON_CHART: Texture = requireAsset("../Icons/show_chart.png") as Texture

const Y_TICKS = 5
const X_TICKS = 5
const TICK_LABEL_H = 1.2

@component
export class LabLoggerGraphPanelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LabLoggerGraphPanelUI – post-run graphs (7)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Unlit material used for chart lines (cloned per line colour).")
  lineMaterial: Material
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Panel width, cm (brief default: about 60 cm).")
  @widget(new SliderWidget(45, 80, 1))
  panelWidthCm: number = 60

  @input
  @hint("Plot area height, cm.")
  @widget(new SliderWidget(14, 34, 0.5))
  plotHeightCm: number = 18

  @input("vec3", "{1.0,0.72,0.35}")
  @hint("Colour of the main data line (temperature / voltage).")
  @widget(new ColorWidget())
  primaryLineColor: vec3

  @input("vec3", "{0.45,0.9,1.0}")
  @hint("Colour of the second data line (resistance V/I).")
  @widget(new ColorWidget())
  secondaryLineColor: vec3

  @input("vec3", "{0.6,0.65,0.75}")
  @hint("Colour of axis and grid lines.")
  @widget(new ColorWidget())
  gridColor: vec3

  @input
  @hint("Data line thickness, cm.")
  @widget(new SliderWidget(0.1, 0.8, 0.05))
  lineThicknessCm: number = 0.3
  @ui.group_end

  private panel!: SceneObject
  private titleText!: Text
  private pageText!: Text
  private legendTexts: Text[] = []
  private yLeft: Text[] = []
  private yRight: Text[] = []
  private xTicks: Text[] = []
  private gridRmv!: RenderMeshVisual
  private seriesRmv: RenderMeshVisual[] = []
  private plotW = 45
  private rows: LogRow[] = []
  private shown = -1
  private pointCount = 0
  private wantVisible = false
  private framesSinceStart = 0
  private _onNext = new Event<void>()
  private _onPrev = new Event<void>()

  get onNextPressed(): PublicApi<void> { return this._onNext.publicApi() }
  get onPreviousPressed(): PublicApi<void> { return this._onPrev.publicApi() }
  pressNext(): void { this._onNext.invoke() }
  pressPrevious(): void { this._onPrev.invoke() }

  get graphCount(): number { return GRAPH_COUNT }
  /** Index (0..6) of the graph currently drawn, -1 before the first one. */
  get shownGraphIndex(): number { return this.shown }
  get currentTitle(): string { return this.titleText ? this.titleText.text : "" }
  get pageLabel(): string { return this.pageText ? this.pageText.text : "" }
  /** Number of data points plotted on the current graph (one per recorded row). */
  get plottedPointCount(): number { return this.pointCount }
  get isVisible(): boolean { return this.panel ? this.panel.enabled : false }

  setVisible(on: boolean): void {
    this.wantVisible = on
    // Before the panel's UIKit children have initialised, keep it enabled; the
    // update tick below applies the wanted state once init has run.
    if (this.panel && this.framesSinceStart >= 3) this.panel.enabled = on
  }

  setRows(rows: LogRow[]): void { this.rows = rows.slice() }

  showGraph(index: number): void {
    const i = Math.max(0, Math.min(GRAPH_COUNT - 1, index))
    this.shown = i
    const spec = buildGraph(i, this.rows)
    this.titleText.text = spec.title
    this.pageText.text = `Graph ${i + 1} of ${GRAPH_COUNT}`
    this.render(spec)
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.panel = obj(this.sceneObject, "GraphPanel")
    const plate = this.panel.createComponent(BackPlate.getTypeName()) as BackPlate

    const W = this.panelWidthCm
    const pad = 2
    const innerW = W - pad * 2
    const axisW = 5.5
    this.plotW = innerW - axisW * 2
    const chartH = this.plotHeightCm + TICK_LABEL_H
    const navH = 5
    const H = pad * 2 + 3 + 2 + chartH + 1.6 + 1.6 + navH + 0.5 * 5
    plate.size = new vec2(W, H)

    const content = obj(this.panel, "Content", new vec3(0, 0, PANEL_CONTENT_Z))
    const col = flexColumn(content, "GraphColumn", W, H, {gap: 0.5, padX: pad, padY: pad, justify: FlexJustify.Start})
    const white = new vec4(1, 1, 1, 1)
    const dim = new vec4(1, 1, 1, 0.7)

    // Title
    const title = flexRow(col, "TitleRow", innerW, 3, {gap: 0.6, align: FlexAlign.Center, justify: FlexJustify.Center})
    iconImage(title, "ChartIcon", ICON_CHART, 2.2)
    this.titleText = rowText(title, "GraphTitle", "T1 temperature vs time", "Headline2", innerW - 4, white,
      HorizontalAlignment.Left, 3)

    // Legend
    const legend = flexRow(col, "LegendRow", innerW, 2, {gap: 2, align: FlexAlign.Center, justify: FlexJustify.Center})
    this.legendTexts.push(rowText(legend, "Legend0", "", "Caption", 24, vec4FromVec3(this.primaryLineColor),
      HorizontalAlignment.Center, 2))
    this.legendTexts.push(rowText(legend, "Legend1", "", "Caption", 24, vec4FromVec3(this.secondaryLineColor),
      HorizontalAlignment.Center, 2))

    // Chart row: left ticks | plot | right ticks
    const chart = flexRow(col, "ChartRow", innerW, chartH, {align: FlexAlign.Center})
    // Tick cells are narrower than the axis column and pushed away from the plot so labels never touch the border.
    const tickW = axisW - 1.0
    const left = flexColumn(chart, "YAxisLeft", axisW, chartH, {justify: FlexJustify.SpaceBetween, align: FlexAlign.Start})
    for (let k = 0; k < Y_TICKS; k++) {
      this.yLeft.push(rowText(left, `YL_${k}`, "", "Caption", tickW, vec4FromVec3(this.primaryLineColor),
        HorizontalAlignment.Right, TICK_LABEL_H))
    }
    flexChild(chart, "PlotArea", {w: this.plotW, h: chartH}, (plot) => {
      this.gridRmv = this.makeLayer(plot, "GridLines", 0.05, vec4FromVec3(this.gridColor, 0.55))
      this.seriesRmv.push(this.makeLayer(plot, "Series0", 0.1, vec4FromVec3(this.primaryLineColor)))
      this.seriesRmv.push(this.makeLayer(plot, "Series1", 0.12, vec4FromVec3(this.secondaryLineColor)))
    })
    const right = flexColumn(chart, "YAxisRight", axisW, chartH, {justify: FlexJustify.SpaceBetween, align: FlexAlign.End})
    for (let k = 0; k < Y_TICKS; k++) {
      this.yRight.push(rowText(right, `YR_${k}`, "", "Caption", tickW, vec4FromVec3(this.secondaryLineColor),
        HorizontalAlignment.Left, TICK_LABEL_H))
    }

    // X tick labels (centres line up with the vertical grid lines)
    const xLabelW = 4
    const xrow = flexRow(col, "XAxisRow", innerW, 1.6, {align: FlexAlign.Center, justify: FlexJustify.Center})
    const xticks = flexRow(xrow, "XTicks", this.plotW + xLabelW, 1.6, {justify: FlexJustify.SpaceBetween,
      align: FlexAlign.Center})
    for (let k = 0; k < X_TICKS; k++) {
      this.xTicks.push(rowText(xticks, `XT_${k}`, "", "Caption", xLabelW, dim, HorizontalAlignment.Center, 1.6))
    }
    columnText(col, "XAxisTitle", "Time (s)", "Caption", 1.6, dim)

    // Navigation: big Previous / Next buttons + "Graph N of 7"
    const nav = flexRow(col, "NavRow", innerW, navH, {gap: 3, align: FlexAlign.Center, justify: FlexJustify.Center})
    this.addNavButton(nav, "PreviousButton", "< Previous", () => this._onPrev.invoke())
    this.pageText = rowText(nav, "PageLabel", "Graph 1 of 7", "Headline2", 16, white, HorizontalAlignment.Center, 3)
    this.addNavButton(nav, "NextButton", "Next >", () => this._onNext.invoke())

    // Start hidden, but only after UIKit children have run their OnStart init.
    this.createEvent("UpdateEvent").bind(() => {
      if (this.framesSinceStart < 3) {
        this.framesSinceStart++
        if (this.framesSinceStart === 3) this.panel.enabled = this.wantVisible
      }
    })
  }

  private addNavButton(parent: SceneObject, name: string, label: string, onPress: () => void): void {
    const bw = 15, bh = 4.6
    flexChild(parent, name, {w: bw, h: bh}, (so) => {
      const btn = so.createComponent(Button.getTypeName()) as Button
      btn.size = new vec3(bw, bh, 1)   // BEFORE init
      buttonLabel(so, label, bw - 0.5, "Subheadline", new vec4(1, 1, 1, 1))
      btn.onTriggerUp.add(onPress)
    })
  }

  private makeLayer(parent: SceneObject, name: string, z: number, color: vec4): RenderMeshVisual {
    const so = obj(parent, name, new vec3(0, 0, z))
    const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (this.lineMaterial) {
      const mat = this.lineMaterial.clone()
      mat.mainPass.baseColor = color
      rmv.mainMaterial = mat
    }
    return rmv
  }

  // ── Chart drawing (MeshBuilder line quads; plot-local cm, origin = plot centre) ──
  private render(spec: GraphSpec): void {
    const halfW = this.plotW / 2
    const halfH = this.plotHeightCm / 2
    const times = spec.times
    const tMax = Math.max(10, times.length > 0 ? times[times.length - 1] : 10)
    const xr = niceRange([0, tMax], X_TICKS)
    xr.min = 0
    const xOf = (t: number) => -halfW + (t - xr.min) / (xr.max - xr.min) * this.plotW
    for (let k = 0; k < X_TICKS; k++) this.xTicks[k].text = fmtTick(xr.min + k * xr.step, xr.step)

    // Grid: border + inner lines
    const grid: number[][] = []
    for (let k = 0; k < Y_TICKS; k++) {
      const y = -halfH + k * (this.plotHeightCm / (Y_TICKS - 1))
      grid.push([-halfW, y, halfW, y])
    }
    for (let k = 0; k < X_TICKS; k++) {
      const x = -halfW + k * (this.plotW / (X_TICKS - 1))
      grid.push([x, -halfH, x, halfH])
    }
    this.gridRmv.mesh = this.buildLines(grid, 0.06, [])

    this.pointCount = times.length
    for (let s = 0; s < this.seriesRmv.length; s++) {
      const series = spec.series[s]
      const labels = s === 0 ? this.yLeft : this.yRight
      if (!series) {
        this.seriesRmv[s].enabled = false
        this.legendTexts[s].text = ""
        if (s === 1) for (const t of this.yRight) t.text = ""
        continue
      }
      this.seriesRmv[s].enabled = true
      const axisNote = spec.series.length > 1 ? (series.axis === 0 ? ", left axis" : ", right axis") : ""
      this.legendTexts[s].text = `● ${series.label} (${series.unit}${axisNote})`
      const yr = niceRange(series.values, Y_TICKS)
      // SpaceBetween column lists top → bottom, so label k shows max − k·step
      for (let k = 0; k < Y_TICKS; k++) {
        const v = fmtTick(yr.max - k * yr.step, yr.step)
        labels[k].text = v
      }
      const yOf = (v: number) => -halfH + (v - yr.min) / (yr.max - yr.min) * this.plotHeightCm
      const segs: number[][] = []
      const pts: number[][] = []
      for (let i = 0; i < series.values.length; i++) {
        const p = [xOf(times[i]), yOf(series.values[i])]
        pts.push(p)
        if (i > 0) segs.push([pts[i - 1][0], pts[i - 1][1], p[0], p[1]])
      }
      this.seriesRmv[s].mesh = this.buildLines(segs, this.lineThicknessCm, pts)
    }
    if (spec.series.length < 2) for (const t of this.yRight) t.text = ""
  }

  /** Thick line segments as quads + square point markers, facing +Z. */
  private buildLines(segs: number[][], thick: number, points: number[][]): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2},
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    let base = 0
    const quad = (a: number[], b: number[], c: number[], d: number[]) => {
      // a,b,c,d counter-clockwise when viewed from +Z
      mb.appendVerticesInterleaved([
        a[0], a[1], 0, 0, 0, 1, 0, 0,
        b[0], b[1], 0, 0, 0, 1, 1, 0,
        c[0], c[1], 0, 0, 0, 1, 1, 1,
        d[0], d[1], 0, 0, 0, 1, 0, 1,
      ])
      mb.appendIndices([base, base + 1, base + 2, base, base + 2, base + 3])
      base += 4
    }
    for (const sg of segs) {
      const dx = sg[2] - sg[0], dy = sg[3] - sg[1]
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 1e-5) continue
      const nx = -dy / len * thick / 2, ny = dx / len * thick / 2
      quad([sg[0] - nx, sg[1] - ny], [sg[2] - nx, sg[3] - ny], [sg[2] + nx, sg[3] + ny], [sg[0] + nx, sg[1] + ny])
    }
    const m = thick * 1.4
    for (const p of points) {
      quad([p[0] - m, p[1] - m], [p[0] + m, p[1] - m], [p[0] + m, p[1] + m], [p[0] - m, p[1] + m])
    }
    if (base === 0) {
      // keep a valid (degenerate) mesh so the visual never errors on empty data
      quad([0, 0], [0, 0], [0, 0], [0, 0])
    }
    mb.updateMesh()
    return mb.getMesh()
  }
}
