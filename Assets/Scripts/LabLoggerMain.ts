/**
 * LabLoggerMain — orchestrates the Lab Logger: Start/Stop recording, the
 * 10-second logging timer, the stand-in instrument values, and graph navigation.
 *
 * Owns:   all domain state — isRecording, rows (the observation log),
 *         runTimeSec / elapsedSec, currentGraphIndex.
 * Inputs: the four authored UI modules + the audio controller (wired in the scene),
 *         and a few tunables (log interval, display refresh, ambient, heater volts).
 * Flow:   Start → heaters on, row logged at t = 0 then every logIntervalSec;
 *         each logged row is a frozen copy of exactly what the displays show at
 *         that moment. Stop → table hides, graph 1 of 7 shows (built from rows).
 * Must not: create UI text or UIKit components (they live in the *UI.ts modules).
 *
 * Public state for LEAF: isRecording, rows, rowCount, elapsedSec, currentGraphIndex,
 * graphCount, logIntervalSec; methods startRecording(), stopRecording(),
 * toggleRecording(), nextGraph(), previousGraph(), currentDisplayedReading().
 */
import {DEFAULT_MODEL, GRAPH_COUNT, LogRow, Reading, SampleModelParams, copyReading, sampleAt} from "./LabLoggerData"
import {LabLoggerAudio} from "./LabLoggerAudio"
import {LabLoggerGraphPanelUI} from "./LabLoggerGraphPanelUI"
import {LabLoggerObservationTableUI} from "./LabLoggerObservationTableUI"
import {LabLoggerSensorDisplaysUI} from "./LabLoggerSensorDisplaysUI"
import {LabLoggerStartStopButtonUI} from "./LabLoggerStartStopButtonUI"

@component
export class LabLoggerMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LabLoggerMain – recording, logging timer, graphs</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("The five T1–T5 sensor displays on the bench.")
  sensorDisplays: LabLoggerSensorDisplaysUI

  @input
  @hint("The observation table above the displays.")
  observationTable: LabLoggerObservationTableUI

  @input
  @hint("The graphs panel shown after Stop.")
  graphPanel: LabLoggerGraphPanelUI

  @input
  @hint("The big Start/Stop button on the bench.")
  startStopButton: LabLoggerStartStopButtonUI

  @input
  @hint("Feedback sounds.")
  audio: LabLoggerAudio
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Seconds between logged rows (brief: 10 s). Lower it to test faster.")
  @widget(new SliderWidget(1, 60, 1))
  logIntervalSec: number = 10

  @input
  @hint("How often the sensor displays refresh their values, seconds.")
  @widget(new SliderWidget(0.25, 5, 0.25))
  displayRefreshSec: number = 1

  @input
  @hint("Room / starting temperature of the scripted sample data, °C.")
  @widget(new SliderWidget(10, 35, 0.5))
  ambientTempC: number = 25

  @input
  @hint("Supply voltage of the heater on T4, volts.")
  @widget(new SliderWidget(1, 30, 0.5))
  heater1Volts: number = 12

  @input
  @hint("Supply voltage of the heater on T5, volts.")
  @widget(new SliderWidget(1, 30, 0.5))
  heater2Volts: number = 10

  @input
  @hint("Print a log line for every recorded row (debugging).")
  debugLogging: boolean = false
  @ui.group_end

  // ── Domain state (single owner) ────────────────────────────────────────────
  private _isRecording = false
  private _rows: LogRow[] = []
  private _elapsedSec = 0
  private _runTimeSec = 0
  private _heatersOn = false
  private _nextLogAt = 0
  private _sinceRefresh = 0
  private _currentGraphIndex = 0
  private _shownReading: Reading | null = null
  private model: SampleModelParams = DEFAULT_MODEL
  private ready = false

  get isRecording(): boolean { return this._isRecording }
  /** Copy of all logged rows (oldest first). */
  get rows(): LogRow[] { return this._rows.map(copyReading) }
  get rowCount(): number { return this._rows.length }
  /** Seconds since Start (frozen after Stop). */
  get elapsedSec(): number { return this._elapsedSec }
  get currentGraphIndex(): number { return this._currentGraphIndex }
  get graphCount(): number { return GRAPH_COUNT }
  /** The values currently on the sensor displays. */
  currentDisplayedReading(): Reading | null { return this._shownReading ? copyReading(this._shownReading) : null }

  onAwake(): void {
    if (!this.sensorDisplays || !this.observationTable || !this.graphPanel || !this.startStopButton) {
      print("LabLoggerMain: a required UI @input is not wired — check the scene wiring.")
      return
    }
    this.model = {
      ...DEFAULT_MODEL,
      ambientC: this.ambientTempC,
      heater1Volts: this.heater1Volts,
      heater2Volts: this.heater2Volts,
    }
    this.ready = true
    // SIK/UIKit event subscriptions bind in OnStart (init-order rule).
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onStart(): void {
    this.startStopButton.onPressed.add(() => this.toggleRecording())
    this.graphPanel.onNextPressed.add(() => this.nextGraph())
    this.graphPanel.onPreviousPressed.add(() => this.previousGraph())
    this.startStopButton.setRecording(false)
    this.observationTable.setVisible(true)
    this.observationTable.setStatus(`Press Start — a row is logged every ${this.logIntervalSec} s`)
    this.graphPanel.setVisible(false)
    this.pushDisplays()
  }

  // ── Public commands ────────────────────────────────────────────────────────
  toggleRecording(): void {
    if (this._isRecording) this.stopRecording()
    else this.startRecording()
  }

  startRecording(): void {
    if (!this.ready || this._isRecording) return
    this._isRecording = true
    this._heatersOn = true
    this._rows = []
    this._elapsedSec = 0
    this._runTimeSec = 0
    this._nextLogAt = 0
    this._sinceRefresh = 0
    this.observationTable.clear()
    this.graphPanel.setVisible(false)
    this.observationTable.setVisible(true)
    this.startStopButton.setRecording(true)
    if (this.audio) this.audio.playStart()
    this.logDueRows()   // row at t = 0
  }

  stopRecording(): void {
    if (!this.ready || !this._isRecording) return
    this._isRecording = false
    this.startStopButton.setRecording(false)
    if (this.audio) this.audio.playStop()
    this.observationTable.setStatus(`Stopped · ${this._rows.length} rows recorded`)
    this.observationTable.setVisible(false)
    this.graphPanel.setRows(this._rows)
    this._currentGraphIndex = 0
    this.graphPanel.showGraph(0)
    this.graphPanel.setVisible(true)
  }

  nextGraph(): void { this.goToGraph(this._currentGraphIndex + 1) }
  previousGraph(): void { this.goToGraph(this._currentGraphIndex - 1) }

  goToGraph(index: number): void {
    if (!this.ready || this._isRecording || this._rows.length === 0) return
    const n = GRAPH_COUNT
    this._currentGraphIndex = ((index % n) + n) % n   // wrap around 1..7
    this.graphPanel.showGraph(this._currentGraphIndex)
    if (this.audio) this.audio.playNav()
  }

  // ── Per-frame ──────────────────────────────────────────────────────────────
  private onUpdate(): void {
    if (!this.ready) return
    const dt = getDeltaTime()
    if (this._heatersOn) this._runTimeSec += dt
    if (this._isRecording) {
      this._elapsedSec += dt
      this.logDueRows()
      const next = Math.max(0, Math.ceil(this._nextLogAt - this._elapsedSec))
      this.observationTable.setStatus(
        `● Recording · ${Math.floor(this._elapsedSec)} s · ${this._rows.length} rows · next in ${next} s`)
    }
    this._sinceRefresh += dt
    if (this._sinceRefresh >= this.displayRefreshSec) {
      this._sinceRefresh = 0
      this.pushDisplays()
    }
  }

  /** Log every row whose time has come. Each row = exactly what the displays show at that instant. */
  private logDueRows(): void {
    while (this._isRecording && this._elapsedSec + 1e-6 >= this._nextLogAt) {
      const t = this._nextLogAt
      const reading = sampleAt(t, true, this.model)
      this.showOnDisplays(reading)              // displays show the logged values at the logging moment
      const row = copyReading(reading)          // "read" the instruments
      this._rows.push(row)
      this.observationTable.addRow(row)
      if (this.audio && t > 0) this.audio.playRowLogged()
      if (this.debugLogging) print(`LabLogger row ${this._rows.length}: t=${row.timeSec}s T=${row.temps.join(",")}`)
      this._nextLogAt += Math.max(1, this.logIntervalSec)
      this._sinceRefresh = 0
    }
  }

  private pushDisplays(): void {
    this.showOnDisplays(sampleAt(this._runTimeSec, this._heatersOn, this.model))
  }

  private showOnDisplays(r: Reading): void {
    this._shownReading = r
    this.sensorDisplays.setReading(r)
  }
}
