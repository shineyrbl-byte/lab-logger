/**
 * LabLoggerStartStopButtonUI — the one big Start/Stop button on the bench.
 *
 * Owns:   a UIKit Button (with ElementContent icon + label face) and its label state.
 * API:    setRecording(on)  → label "Stop" + stop icon while recording, "Start" + play icon otherwise.
 *         onPressed (Event<void>) → fired on pinch / click.
 *         labelText (getter) → the visible label, for LEAF checks.
 * Must not: decide whether recording starts or stops — LabLoggerMain owns that state.
 */
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

const ICON_PLAY: Texture = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_STOP: Texture = requireAsset("../Icons/stop_circle.png") as Texture

// Type scale (Specs, z = -110 cm) — ElementContent takes size only.
const FONT_SIZE_SCALE = 1.0
const TYPE_SCALE: Record<string, number> = {Headline1: 54, Body: 39}
function roleSize(role: string): number { return TYPE_SCALE[role] * FONT_SIZE_SCALE }

@component
export class LabLoggerStartStopButtonUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">LabLoggerStartStopButtonUI – big Start/Stop button</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Button diameter in cm (brief default: about 8 cm).")
  @widget(new SliderWidget(5, 14, 0.5))
  buttonSizeCm: number = 8

  @input
  @hint("Label shown before / after recording.")
  startLabel: string = "Start"

  @input
  @hint("Label shown while recording.")
  stopLabel: string = "Stop"
  @ui.group_end

  private button!: Button
  private content!: ElementContent
  private recording = false
  private _onPressed = new Event<void>()

  /** Fired when the user pinches/clicks the button. */
  get onPressed(): PublicApi<void> { return this._onPressed.publicApi() }

  /** The label currently shown on the button ("Start" or "Stop"). */
  get labelText(): string { return this.recording ? this.stopLabel : this.startLabel }

  /** True while the button is showing the recording ("Stop") state. */
  get isShowingStop(): boolean { return this.recording }

  /** Programmatic press — same path as a pinch (used by LEAF / debugging). */
  press(): void { this._onPressed.invoke() }

  setRecording(on: boolean): void {
    this.recording = on
    if (!this.content) return
    this.content.text = this.labelText
    this.content.leadingIcon = on ? ICON_STOP : ICON_PLAY
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")

    const btnObj = global.scene.createSceneObject("StartStopButtonFace")
    btnObj.setParent(this.sceneObject)
    this.button = btnObj.createComponent(Button.getTypeName()) as Button
    this.button.size = new vec3(this.buttonSizeCm, this.buttonSizeCm, 1)   // BEFORE init

    // ElementContent is the button's entire face (companion mode on the same SceneObject,
    // no row siblings) → safe per R1. It positions its own icon/text in front of the face.
    this.content = btnObj.createComponent(ElementContent.getTypeName()) as ElementContent
    this.content.iconLayout = "top"
    this.content.leadingIcon = ICON_PLAY
    this.content.leadingIconSize = this.buttonSizeCm * 0.4
    this.content.text = this.startLabel
    this.content.textSize = roleSize("Headline1")   // big readable label on an 8 cm target
    this.content.contentAlignment = "center"

    this.button.onTriggerUp.add(() => this._onPressed.invoke())
  }
}
