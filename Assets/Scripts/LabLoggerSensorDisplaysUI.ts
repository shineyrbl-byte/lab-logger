/**
 * LabLoggerSensorDisplaysUI — the stand-in instruments: five temperature
 * sensor displays (T1–T5) in a row on the bench; T4 and T5 also show their
 * heater's voltage and current.
 *
 * Owns:   five UIKit BackPlate cards with FlexLayout content.
 * API:    setReading(r)          → push the current instrument values (from LabLoggerMain).
 *         displayedReading       → the exact values currently on screen (LEAF check for criterion 2).
 *         getDisplayText(k)      → visible text of display k (0..4).
 * Must not: generate or decide values — it is a passive view.
 */
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Reading, copyReading, fmtAmp, fmtTemp, fmtVolt} from "./LabLoggerData"
import {
  PANEL_CONTENT_Z, columnText, flexChild, flexColumn, flexRow, iconImage, obj, rowText, vec4FromVec3,
} from "./LabLoggerStyleUI"

const ICON_THERMO: Texture = requireAsset("../Icons/device_thermostat.png") as Texture

const SENSOR_COUNT = 5

@component
export class LabLoggerSensorDisplaysUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LabLoggerSensorDisplaysUI – T1–T5 sensor displays (stand-in instruments)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Width of each sensor display card, cm.")
  @widget(new SliderWidget(7, 14, 0.5))
  cardWidthCm: number = 10

  @input
  @hint("Height of each sensor display card, cm.")
  @widget(new SliderWidget(10, 20, 0.5))
  cardHeightCm: number = 14.5

  @input
  @hint("Gap between neighbouring display cards, cm.")
  @widget(new SliderWidget(0, 4, 0.1))
  cardGapCm: number = 1.2

  @input("vec3", "{1.0,0.86,0.62}")
  @hint("Colour of the big temperature readout (keep it light — the display is additive).")
  @widget(new ColorWidget())
  temperatureColor: vec3

  @input("vec3", "{0.55,0.85,1.0}")
  @hint("Colour of the heater voltage / current readouts on T4 and T5.")
  @widget(new ColorWidget())
  heaterColor: vec3
  @ui.group_end

  private tempTexts: Text[] = []
  private voltTexts: (Text | null)[] = []
  private ampTexts: (Text | null)[] = []
  private _displayed: Reading | null = null

  /** The values currently shown on the five displays (null until the first push). */
  get displayedReading(): Reading | null { return this._displayed ? copyReading(this._displayed) : null }

  /** Visible text of display k (0..4), e.g. "T4 62.4 °C 12.01 V 1.402 A". */
  getDisplayText(k: number): string {
    if (k < 0 || k >= this.tempTexts.length) return ""
    let s = `T${k + 1} ${this.tempTexts[k].text} °C`
    const v = this.voltTexts[k], a = this.ampTexts[k]
    if (v && a) s += ` ${v.text} ${a.text}`
    return s
  }

  setReading(r: Reading): void {
    this._displayed = copyReading(r)
    for (let k = 0; k < this.tempTexts.length; k++) {
      this.tempTexts[k].text = fmtTemp(r.temps[k])
    }
    if (this.voltTexts[3]) this.voltTexts[3]!.text = `${fmtVolt(r.v4)} V`
    if (this.ampTexts[3]) this.ampTexts[3]!.text = `${fmtAmp(r.i4)} A`
    if (this.voltTexts[4]) this.voltTexts[4]!.text = `${fmtVolt(r.v5)} V`
    if (this.ampTexts[4]) this.ampTexts[4]!.text = `${fmtAmp(r.i5)} A`
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const w = this.cardWidthCm, h = this.cardHeightCm
    const rowW = SENSOR_COUNT * w + (SENSOR_COUNT - 1) * this.cardGapCm
    const row = flexRow(this.sceneObject, "DisplayRow", rowW, h, {
      gap: this.cardGapCm, justify: FlexJustify.Center, align: FlexAlign.Center,
    })
    for (let k = 0; k < SENSOR_COUNT; k++) {
      flexChild(row, `SensorDisplay_T${k + 1}`, {w, h}, (card) => this.buildCard(card, k))
    }
  }

  private buildCard(card: SceneObject, k: number): void {
    const w = this.cardWidthCm, h = this.cardHeightCm
    const plate = card.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.size = new vec2(w, h)

    const inner = obj(card, "CardContent", new vec3(0, 0, PANEL_CONTENT_Z))
    const col = flexColumn(inner, "CardColumn", w, h, {gap: 0.3, padY: 0.8, padX: 0.5, justify: FlexJustify.Start})
    const white = new vec4(1, 1, 1, 1)
    const dim = new vec4(1, 1, 1, 0.6)
    const isHeater = k >= 3

    // Header: thermometer icon + sensor name
    const header = flexRow(col, "Header", w - 1, 2.4, {gap: 0.4, justify: FlexJustify.Center, align: FlexAlign.Center})
    iconImage(header, "Icon", ICON_THERMO, 1.8)
    rowText(header, "Name", `T${k + 1}`, "Headline2", 2.6, white)

    // Big temperature readout + unit
    this.tempTexts.push(columnText(col, "Temperature", "25.0", "HeadlineXL", 3.0, vec4FromVec3(this.temperatureColor)))
    columnText(col, "TempUnit", "°C", "Caption", 1.4, dim)

    if (isHeater) {
      columnText(col, "HeaterLabel", "Heater", "Caption", 1.3, dim)
      this.voltTexts.push(columnText(col, "Voltage", "0.00 V", "Body", 1.5, vec4FromVec3(this.heaterColor)))
      this.ampTexts.push(columnText(col, "Current", "0.000 A", "Body", 1.5, vec4FromVec3(this.heaterColor)))
    } else {
      columnText(col, "SensorLabel", "Temperature", "Caption", 1.3, dim)
      this.voltTexts.push(null)
      this.ampTexts.push(null)
    }
  }
}
