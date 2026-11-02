/**
 * Criterion 2 (default interval) — with the shipped configuration (no override),
 * logIntervalSec is 10 and the second row appears ~10 s after the first.
 * Real-time check (~11 s). Start pressed with a real SIK pinch.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {START_STOP_BUTTON, now, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

@component
export class C2DefaultIntervalScenario extends Scenario {
  async run(): Promise<void> {
    const main = await waitForLens()
    expect(main.logIntervalSec, "configured default interval").toBe(10)

    const interactor = new DefaultLeafInteractor()
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    expect(main.rowCount, "row at t=0").toBe(1)
    const t0 = now()

    await sleep(8500)
    expect(main.rowCount, "no second row before 10 s").toBe(1)

    await waitUntil(() => main.rowCount >= 2, 4000, () => `second row missing after ${(now() - t0).toFixed(1)}s`)
    const gap = now() - t0
    expect(gap > 9.4 && gap < 11.0, `second row after ${gap.toFixed(2)}s (≈10 s)`).toBe(true)
    expect(main.rows[1].timeSec).toBe(10)
    expect(main.observationTable.latestRowText.split(" | ")[0]).toBe("10")
  }
}
