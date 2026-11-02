/**
 * Criterion 5 — Next and Previous move through all seven graphs
 * (five temperature, two voltage/resistance). All presses are real SIK pinches
 * on the UIKit NextButton / PreviousButton (DefaultLeafInteractor).
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {NEXT_BUTTON, PREVIOUS_BUTTON, START_STOP_BUTTON, textOf, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

const TITLES = [
  "T1 temperature vs time",
  "T2 temperature vs time",
  "T3 temperature vs time",
  "T4 temperature vs time",
  "T5 temperature vs time",
  "Heater on T4: voltage & resistance vs time",
  "Heater on T5: voltage & resistance vs time",
]

@component
export class C5GraphNavigationScenario extends Scenario {
  async run(): Promise<void> {
    const main = await waitForLens()
    const graph = main.graphPanel
    const it = new DefaultLeafInteractor()

    main.logIntervalSec = 1
    await it.trigger(await waitForInteractable(START_STOP_BUTTON))
    await waitUntil(() => main.rowCount >= 3, 6000)
    await it.trigger(await waitForInteractable(START_STOP_BUTTON))
    await sleep(500)
    expect(graph.isVisible).toBe(true)
    expect(main.graphCount).toBe(7)
    const rows = main.rowCount

    const check = (i: number, how: string) => {
      expect(main.currentGraphIndex, `${how}: index`).toBe(i)
      expect(graph.shownGraphIndex, `${how}: shown`).toBe(i)
      expect(graph.pageLabel, `${how}: page label`).toBe(`Graph ${i + 1} of 7`)
      expect(graph.currentTitle, `${how}: title`).toBe(TITLES[i])
      expect(graph.plottedPointCount, `${how}: points`).toBe(rows)
      const legend1 = textOf("Legend1")
      if (i < 5) {
        expect(textOf("Legend0").includes(`T${i + 1}`), `${how}: temp legend`).toBe(true)
        expect(legend1, `${how}: single series`).toBe("")
      } else {
        const dev = i === 5 ? 4 : 5
        expect(textOf("Legend0").includes(`V${dev}`), `${how}: voltage series`).toBe(true)
        expect(legend1.includes(`R${dev} = V/I`), `${how}: resistance series`).toBe(true)
      }
    }
    check(0, "after Stop")

    const seen = new Set<string>([graph.currentTitle])
    for (let i = 1; i < 7; i++) {
      await it.trigger(await waitForInteractable(NEXT_BUTTON))
      await sleep(250)
      check(i, `Next → ${i + 1}`)
      seen.add(graph.currentTitle)
    }
    expect(seen.size, "seven distinct graphs").toBe(7)

    // Previous walks all the way back
    for (let i = 5; i >= 0; i--) {
      await it.trigger(await waitForInteractable(PREVIOUS_BUTTON))
      await sleep(250)
      check(i, `Previous → ${i + 1}`)
    }

    // Wrap-around at the ends (design: wraps 1 ↔ 7)
    await it.trigger(await waitForInteractable(PREVIOUS_BUTTON))
    await sleep(250)
    check(6, "Previous from 1 wraps to 7")
    await it.trigger(await waitForInteractable(NEXT_BUTTON))
    await sleep(250)
    check(0, "Next from 7 wraps to 1")
  }
}
