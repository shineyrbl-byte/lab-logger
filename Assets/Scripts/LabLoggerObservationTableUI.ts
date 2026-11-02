/**
 * LabLoggerObservationTableUI — the observation table that floats just above
 * the sensor displays while recording.
 *
 * Owns:   a UIKit BackPlate panel: title + status line, column header row,
 *         a UIKit ScrollWindow with the older rows (drag to scroll), and a
 *         pinned, highlighted "newest reading" row that is always in view.
 * API:    addRow(row), clear(), setStatus(text), setVisible(on)
 *         scrollToNewest(), scrollToOldest(), scrollHistoryNormalized(y)
 *         rowCount, latestRowText, getRowText(i), isVisible, isNewestRowVisible
 * Must not: decide when rows are logged or what their values are — LabLoggerMain
 *           pushes frozen LogRows in; this module only renders them.
 */
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {ContentVerticalAlignment} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/LayoutTypes"
import {ScrollWindow} from "SpectaclesUIKit.lspkg/Scripts/Components/ScrollWindow/ScrollWindow"
import {LogRow, TABLE_HEADERS, rowCells} from "./LabLoggerData"
import {
  PANEL_CONTENT_Z, columnText, flexChild, flexColumn, flexRow, iconImage, obj, rowText, vec4FromVec3,
} from "./LabLoggerStyleUI"

const ICON_TABLE: Texture = requireAsset("../Icons/table_chart.png") as Texture

const COLS = 10

@component
export class LabLoggerObservationTableUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LabLoggerObservationTableUI – live observation table</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Table panel width, cm (brief default: about 60 cm).")
  @widget(new SliderWidget(45, 80, 1))
  panelWidthCm: number = 60

  @input
  @hint("How many older rows are visible at once in the scrollable history.")
  @widget(new SliderWidget(3, 12, 1))
  visibleHistoryRows: number = 6

  @input
  @hint("Height of one table row, cm.")
  @widget(new SliderWidget(1.6, 3.5, 0.1))
  rowHeightCm: number = 2.2

  @input
  @hint("Table title text.")
  titleText: string = "Observation Table"

  @input("vec3", "{0.55,1.0,0.65}")
  @hint("Highlight colour for the newest row.")
  @widget(new ColorWidget())
  newestRowColor: vec3

  @input("vec3", "{0.55,0.85,1.0}")
  @hint("Colour of the column header labels.")
  @widget(new ColorWidget())
  headerColor: vec3
  @ui.group_end

  private panel!: SceneObject
  private statusText!: Text
  private scroll!: ScrollWindow
  private list!: SceneObject
  private listFlex!: FlexLayout
  private latestCells: Text[] = []
  private historyRows: SceneObject[] = []
  private rows: LogRow[] = []
  private followNewest = true
  private innerW = 56

  // ── Read-only state for the main script / LEAF ─────────────────────────────
  get rowCount(): number { return this.rows.length }
  get historyRowCount(): number { return this.historyRows.length }
  get isVisible(): boolean { return this.panel ? this.panel.enabled : false }
  /** The newest row is pinned below the scroll area, so it is always visible while the table is. */
  get isNewestRowVisible(): boolean { return this.isVisible && this.rows.length > 0 }
  /** Visible text of the pinned newest row, cells joined by " | ". */
  get latestRowText(): string { return this.latestCells.map((t) => t.text).join(" | ") }
  /** Text of logged row i (0 = oldest), cells joined by " | ". */
  getRowText(i: number): string {
    return i >= 0 && i < this.rows.length ? rowCells(this.rows[i]).join(" | ") : ""
  }
  /** History scroll position: +1 = oldest rows at top in view, -1 = newest (bottom). */
  get historyScrollNormalized(): number { return this.scroll ? this.scroll.scrollPositionNormalized.y : -1 }
  get statusLine(): string { return this.statusText ? this.statusText.text : "" }

  // ── Mutators (called by LabLoggerMain) ─────────────────────────────────────
  setVisible(on: boolean): void { if (this.panel) this.panel.enabled = on }

  setStatus(text: string): void { if (this.statusText) this.statusText.text = text }

  clear(): void {
    for (const r of this.historyRows) r.destroy()
    this.historyRows = []
    this.rows = []
    for (const t of this.latestCells) t.text = "–"
    this.latestCells[0].text = "—"
    this.followNewest = true
    this.refreshScrollSize()
  }

  addRow(row: LogRow): void {
    // The previous newest row moves into the scrollable history.
    if (this.rows.length > 0) this.appendHistoryRow(this.rows[this.rows.length - 1])
    this.rows.push(row)
    const cells = rowCells(row)
    for (let c = 0; c < COLS; c++) this.latestCells[c].text = cells[c]
    this.refreshScrollSize()
    if (this.followNewest) this.scrollToNewest()
  }

  scrollToNewest(): void {
    this.followNewest = true
    this.scrollHistoryNormalized(-1)
  }

  scrollToOldest(): void {
    this.followNewest = false
    this.scrollHistoryNormalized(1)
  }

  /** Scroll the history: +1 = top (oldest), -1 = bottom (newest). */
  scrollHistoryNormalized(y: number): void {
    if (!this.scroll) return
    this.scroll.scrollPositionNormalized = new vec2(0, Math.max(-1, Math.min(1, y)))
  }

  // ── Build ──────────────────────────────────────────────────────────────────
  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.panel = obj(this.sceneObject, "TablePanel")
    const plate = this.panel.createComponent(BackPlate.getTypeName()) as BackPlate

    const W = this.panelWidthCm
    const pad = 2
    this.innerW = W - pad * 2
    const historyH = this.visibleHistoryRows * this.rowHeightCm
    const H = pad * 2 + 3 + this.rowHeightCm + historyH + 1.4 + (this.rowHeightCm + 0.6) + 0.5 * 4
    plate.size = new vec2(W, H)

    const content = obj(this.panel, "Content", new vec3(0, 0, PANEL_CONTENT_Z))
    const col = flexColumn(content, "TableColumn", W, H, {gap: 0.5, padX: pad, padY: pad, justify: FlexJustify.Start})
    const white = new vec4(1, 1, 1, 1)
    const dim = new vec4(1, 1, 1, 0.65)

    // Title row: icon + title (left), status (right)
    const title = flexRow(col, "TitleRow", this.innerW, 3, {gap: 0.6, align: FlexAlign.Center, justify: FlexJustify.Start})
    iconImage(title, "TableIcon", ICON_TABLE, 2.2)
    rowText(title, "Title", this.titleText, "Headline2", 20, white, HorizontalAlignment.Left, 3)
    this.statusText = rowText(title, "Status", "Press Start to begin logging", "Caption",
      this.innerW - 2.2 - 20 - 1.2, dim, HorizontalAlignment.Right, 3)

    // Column headers
    const cellW = this.innerW / COLS
    const header = flexRow(col, "HeaderRow", this.innerW, this.rowHeightCm, {align: FlexAlign.Center})
    for (let c = 0; c < COLS; c++) {
      rowText(header, `H_${c}`, TABLE_HEADERS[c], "Caption", cellW, vec4FromVec3(this.headerColor),
        HorizontalAlignment.Center, this.rowHeightCm)
    }

    // Scrollable history (drag up/down)
    flexChild(col, "HistoryScroll", {w: this.innerW, h: historyH}, (host) => {
      this.scroll = host.createComponent(ScrollWindow.getTypeName()) as ScrollWindow
      this.scroll.vertical = true
      this.scroll.horizontal = false
      this.scroll.windowSize = new vec2(this.innerW, historyH)
      this.scroll.scrollDimensions = new vec2(this.innerW, historyH)
      this.scroll.edgeFade = true
      // Content created BEFORE ScrollWindow init is moved into its Scroller automatically.
      this.list = obj(host, "HistoryList")
      this.listFlex = this.list.createComponent(FlexLayout.getTypeName()) as FlexLayout
      this.listFlex.autoDiscoverItemsOnStart = false
      this.listFlex.onInitialized.add(() => {
        this.listFlex.width = this.innerW
        this.listFlex.height = historyH
        this.listFlex.direction = FlexDirection.Column
        this.listFlex.justifyContent = FlexJustify.Start
        this.listFlex.alignItems = FlexAlign.Stretch
        this.listFlex.verticalAlignment = ContentVerticalAlignment.Top
        this.listFlex.rowGap = 0
      })
      this.scroll.onScrollEnd.add(() => {
        this.followNewest = this.scroll.scrollPositionNormalized.y <= -0.97
      })
    })

    columnText(col, "NewestLabel", "Newest reading (logged automatically)", "Caption", 1.4, dim,
      HorizontalAlignment.Left)

    // Pinned newest row on its own highlight plate
    flexChild(col, "NewestRow", {w: this.innerW, h: this.rowHeightCm + 0.6}, (cell) => {
      const hp = cell.createComponent(BackPlate.getTypeName()) as BackPlate
      hp.size = new vec2(this.innerW, this.rowHeightCm + 0.6)
      const inner = obj(cell, "NewestInner", new vec3(0, 0, PANEL_CONTENT_Z))
      const r = flexRow(inner, "NewestCells", this.innerW, this.rowHeightCm, {align: FlexAlign.Center})
      for (let c = 0; c < COLS; c++) {
        this.latestCells.push(rowText(r, `N_${c}`, c === 0 ? "—" : "–", "Body", cellW,
          vec4FromVec3(this.newestRowColor), HorizontalAlignment.Center, this.rowHeightCm))
      }
    })
  }

  private appendHistoryRow(row: LogRow): void {
    const cellW = this.innerW / COLS
    const r = flexRow(this.list, `Row_${this.historyRows.length + 1}`, this.innerW, this.rowHeightCm,
      {align: FlexAlign.Center})
    const cells = rowCells(row)
    const color = this.historyRows.length % 2 === 0 ? new vec4(1, 1, 1, 0.92) : new vec4(0.85, 0.92, 1, 0.92)
    for (let c = 0; c < COLS; c++) {
      rowText(r, `C_${c}`, cells[c], "Caption", cellW, color, HorizontalAlignment.Center, this.rowHeightCm)
    }
    this.historyRows.push(r)
  }

  private refreshScrollSize(): void {
    if (!this.scroll || !this.listFlex) return
    const windowH = this.visibleHistoryRows * this.rowHeightCm
    const contentH = Math.max(windowH, this.historyRows.length * this.rowHeightCm)
    this.listFlex.height = contentH
    // With verticalAlignment = Top the layout hangs its content DOWN from the list's
    // origin; ScrollWindow expects content centred on the scroller, so lift by H/2.
    this.list.getTransform().setLocalPosition(new vec3(0, contentH / 2, 0))
    this.scroll.scrollDimensions = new vec2(this.innerW, contentH)
  }
}
