/**
 * Criterion 4+5 (reachability) — IK arm pinches Start, Stop, then Next and Previous
 * on the graph panel like a real user. Run with __leaf__diagnostic_policy = fail-fast.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {NEXT_BUTTON, PREVIOUS_BUTTON, START_STOP_BUTTON, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

@component
export class C5GraphNavigationIKScenario extends Scenario {
  private readonly ik = createIKInteractor()

  async run(): Promise<void> {
    const main = await waitForLens()
    const graph = main.graphPanel
    main.logIntervalSec = 1

    await this.ik.trigger(await waitForInteractable(START_STOP_BUTTON))
    await waitUntil(() => main.rowCount >= 3, 8000, () => `rows=${main.rowCount} recording=${main.isRecording}`)
    await sleep(500)
    await this.ik.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(800)
    expect(main.observationTable.isVisible, "table hidden after IK Stop").toBe(false)
    expect(graph.isVisible, "graph shown after IK Stop").toBe(true)
    expect(graph.pageLabel).toBe("Graph 1 of 7")

    await this.ik.trigger(await waitForInteractable(NEXT_BUTTON))
    await sleep(500)
    expect(graph.pageLabel, "IK Next").toBe("Graph 2 of 7")

    await this.ik.trigger(await waitForInteractable(PREVIOUS_BUTTON))
    await sleep(500)
    expect(graph.pageLabel, "IK Previous").toBe("Graph 1 of 7")
  }
}
