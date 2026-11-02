/**
 * Criterion 3 — as the table grows the newest row is always visible, and older
 * rows can be scrolled back to.
 * Speed: logIntervalSec = 1. Logs enough rows to overflow the visible history
 * (visibleHistoryRows = 6 by default), then:
 *   - asserts the pinned newest row shows the latest logged values on every new row,
 *   - asserts the history is at the newest end and the newest history row is inside
 *     the scroll window while the oldest is outside it,
 *   - scrolls back with a REAL SIK drag on the UIKit ScrollWindow (DefaultLeafInteractor)
 *     and asserts Row_1 (oldest) is now inside the window,
 *   - asserts the public scrollToOldest()/scrollToNewest() API also works.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {getInteractables} from "Leaf.lspkg/Interactors/InteractableUtils"
import {HISTORY_SCROLL, START_STOP_BUTTON, interactableNames, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

@component
export class C3TableScrollScenario extends Scenario {
  async run(): Promise<void> {
    const main = await waitForLens()
    const table = main.observationTable
    const visibleRows = table.visibleHistoryRows
    const rowH = table.rowHeightCm
    const windowH = visibleRows * rowH
    const target = visibleRows + 5   // history = target-1 rows > visibleRows

    main.logIntervalSec = 1
    const interactor = new DefaultLeafInteractor()
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))

    for (let n = 1; n <= target; n++) {
      await waitUntil(() => main.rowCount >= n, 4000, () => `row ${n} missing (rowCount=${main.rowCount})`)
      expect(table.isNewestRowVisible, `newest row visible at row ${n}`).toBe(true)
      expect(table.latestRowText, `pinned row shows newest (row ${n})`).toBe(table.getRowText(main.rowCount - 1))
    }
    // Stop logging growth for the geometry checks (stay on table: don't Stop).
    main.logIntervalSec = 60
    await sleep(1100)   // let any in-flight row land and layout settle
    const rows = main.rowCount
    const history = table.historyRowCount
    expect(history, "history overflows the visible window").toBeGreaterThan(visibleRows)
    expect(history).toBe(rows - 1)
    expect(table.historyScrollNormalized, "following newest (bottom)").toBeCloseTo(-1, 1)

    const host = findSceneObjectByName(HISTORY_SCROLL)
    if (!host) throw new Error("HistoryScroll not found")
    const inWindow = (name: string): boolean => {
      const so = findSceneObjectByName(name)
      if (!so) throw new Error(`${name} not found`)
      const local = host.getTransform().getInvertedWorldTransform().multiplyPoint(so.getTransform().getWorldPosition())
      return Math.abs(local.y) <= windowH / 2 + 0.01
    }
    expect(inWindow(`Row_${history}`), "newest history row inside window").toBe(true)
    expect(inWindow("Row_1"), "oldest row scrolled out of view").toBe(false)

    // Real SIK drag on the ScrollWindow: pull the content down → reveal the oldest rows.
    const scrollInteractable = getInteractables().find((i) => {
      let o: SceneObject | null = i.getSceneObject()
      while (o) { if (o.name === HISTORY_SCROLL) return true; o = o.getParent() }
      return false
    })
    if (!scrollInteractable) throw new Error("No Interactable under HistoryScroll. Interactables: " + interactableNames())
    let attempts = 0
    while (!inWindow("Row_1") && attempts < 6) {
      attempts++
      await interactor.drag(scrollInteractable, new vec3(0, -0.6, 0), 600)
      await sleep(600)
    }
    print(`[C3] drag attempts=${attempts} scrollNormalized=${table.historyScrollNormalized.toFixed(2)}`)
    expect(inWindow("Row_1"), "oldest row reachable by dragging the history").toBe(true)
    expect(table.isNewestRowVisible, "newest row still visible while scrolled back").toBe(true)

    // Public API path
    table.scrollToNewest()
    await sleep(300)
    expect(inWindow("Row_1")).toBe(false)
    table.scrollToOldest()
    await sleep(300)
    expect(inWindow("Row_1"), "scrollToOldest shows Row_1").toBe(true)
    expect(table.historyScrollNormalized).toBeCloseTo(1, 1)
  }
}
