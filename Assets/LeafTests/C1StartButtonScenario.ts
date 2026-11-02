/**
 * Criterion 1 — Pressing Start begins recording, and the button changes to Stop.
 * Real SIK input: DefaultLeafInteractor pinches the actual UIKit Start/Stop button.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {START_STOP_BUTTON, visibleStartStopLabel, waitForInteractable, waitForLens} from "./LabLoggerTestUtils"

@component
export class C1StartButtonScenario extends Scenario {
  async run(): Promise<void> {
    const main = await waitForLens()
    const button = main.startStopButton
    const interactor = new DefaultLeafInteractor()

    // Idle state
    expect(main.isRecording, "idle before Start").toBe(false)
    expect(button.labelText).toBe("Start")
    expect(visibleStartStopLabel(), "visible label before Start").toBe("Start")

    // Pinch Start
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(300)
    expect(main.isRecording, "recording after Start pinch").toBe(true)
    expect(button.isShowingStop).toBe(true)
    expect(button.labelText).toBe("Stop")
    expect(visibleStartStopLabel(), "visible label after Start").toBe("Stop")
    expect(main.rowCount, "row logged at t=0").toBe(1)

    // Pinch again → Stop (toggle back), label returns to Start
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(300)
    expect(main.isRecording, "stopped after second pinch").toBe(false)
    expect(visibleStartStopLabel(), "visible label after Stop").toBe("Start")
  }
}
