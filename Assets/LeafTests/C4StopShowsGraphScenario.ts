/**
 * Criterion 4 — pressing Stop hides the table and shows the first graph, made
 * from the recorded readings. Start AND Stop are real SIK pinches on the button.
 * Speed: logIntervalSec = 1, records ~5 rows.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {START_STOP_BUTTON, textOf, visibleStartStopLabel, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

@component
export class C4StopShowsGraphScenario extends Scenario {
  async run(): Promise<void> {
    const main = await waitForLens()
    const table = main.observationTable
    const graph = main.graphPanel
    expect(graph.isVisible, "graph hidden before recording").toBe(false)

    main.logIntervalSec = 1
    const interactor = new DefaultLeafInteractor()
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    await waitUntil(() => main.rowCount >= 5, 8000, () => `rows=${main.rowCount}`)
    expect(table.isVisible, "table visible while recording").toBe(true)
    expect(graph.isVisible, "graph hidden while recording").toBe(false)

    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(500)
    const rows = main.rows
    expect(main.isRecording).toBe(false)
    expect(visibleStartStopLabel()).toBe("Start")
    expect(table.isVisible, "table hidden after Stop").toBe(false)
    expect(graph.isVisible, "graph shown after Stop").toBe(true)
    expect(main.currentGraphIndex).toBe(0)
    expect(graph.shownGraphIndex).toBe(0)
    expect(graph.pageLabel).toBe("Graph 1 of 7")
    expect(graph.currentTitle).toBe("T1 temperature vs time")
    expect(graph.plottedPointCount, "one plotted point per recorded row").toBe(rows.length)
    expect(rows.length).toBeGreaterThan(4)

    // Built from the recorded readings: Y axis (top YL_0 … bottom YL_4) brackets the T1 values,
    // X axis spans the recorded time.
    const t1 = rows.map((r) => r.temps[0])
    const yTop = parseFloat(textOf("YL_0"))
    const yBottom = parseFloat(textOf("YL_4"))
    expect(yTop >= Math.max(...t1) - 1e-6, `Y top ${yTop} ≥ max T1 ${Math.max(...t1)}`).toBe(true)
    expect(yBottom <= Math.min(...t1) + 1e-6, `Y bottom ${yBottom} ≤ min T1 ${Math.min(...t1)}`).toBe(true)
    expect(yTop - yBottom < 10, "Y range fitted to the data, not a fixed scale").toBe(true)
    const xLast = parseFloat(textOf("XT_4"))
    expect(xLast >= rows[rows.length - 1].timeSec, `X axis end ${xLast} covers last time`).toBe(true)
    expect(textOf("Legend0").includes("T1")).toBe(true)
  }
}
