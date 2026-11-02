/**
 * Criterion 1 (reachability) — a full IK arm reaches the Start/Stop button
 * (~20° right of the default view) and pinches it the way a real user would.
 * Run with __leaf__diagnostic_policy = fail-fast so an unreachable button fails
 * instead of silently falling back to simulated input.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {START_STOP_BUTTON, visibleStartStopLabel, waitForInteractable, waitForLens} from "./LabLoggerTestUtils"

@component
export class C1StartButtonIKScenario extends Scenario {
  private readonly ik = createIKInteractor()

  async run(): Promise<void> {
    const main = await waitForLens()
    expect(main.isRecording).toBe(false)

    await this.ik.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(500)
    expect(main.isRecording, "recording after IK pinch on Start").toBe(true)
    expect(main.startStopButton.labelText).toBe("Stop")
    expect(visibleStartStopLabel()).toBe("Stop")
  }
}
