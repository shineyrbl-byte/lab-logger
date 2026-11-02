/**
 * Criterion 2 — while recording, a new row appears every logIntervalSec with the
 * time and all values (T1–T5, V/I for T4/T5) matching the sensor displays at that moment.
 * Speed: logIntervalSec lowered to `interval_sec` (default 2) before pressing Start.
 * Start is pressed with a real SIK pinch (DefaultLeafInteractor).
 * For each new row (detected the first frame it exists) we compare:
 *   table newest-row cells  ⇔  visible sensor display texts (getDisplayText)
 *   main.rows[last]         ⇔  sensorDisplays.displayedReading (numeric)
 *   row time column         =  (n-1) · interval;   wall-clock gap ≈ interval
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {ScenarioConfig} from "Leaf.lspkg/Scenarios/scenario/ScenarioConfig"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {START_STOP_BUTTON, now, waitForInteractable, waitForLens, waitUntil} from "./LabLoggerTestUtils"

@component
export class C2RowMatchesDisplaysScenario extends Scenario {
  async run(config?: ScenarioConfig): Promise<void> {
    const interval = config?.getNumber("interval_sec") ?? 2
    const wantRows = config?.getNumber("rows") ?? 5
    const main = await waitForLens()
    const displays = main.sensorDisplays
    const table = main.observationTable

    main.logIntervalSec = interval
    const interactor = new DefaultLeafInteractor()
    await interactor.trigger(await waitForInteractable(START_STOP_BUTTON))
    expect(main.isRecording).toBe(true)

    let lastCount = 0
    let lastAt = 0
    while (lastCount < wantRows) {
      const target = lastCount + 1
      await waitUntil(() => main.rowCount >= target, (interval + 3) * 1000,
        () => `row ${target} did not appear within ${interval + 3}s (rowCount=${main.rowCount})`)
      const t = now()
      // Same frame the row appeared: compare against what the displays show right now.
      expect(main.rowCount, "exactly one new row per interval").toBe(target)
      expect(table.rowCount).toBe(target)
      const cells = table.latestRowText.split(" | ")
      expect(cells.length, "10 table columns").toBe(10)
      for (let k = 0; k < 5; k++) {
        let expected = `T${k + 1} ${cells[k + 1]} °C`
        if (k === 3) expected += ` ${cells[6]} V ${cells[7]} A`
        if (k === 4) expected += ` ${cells[8]} V ${cells[9]} A`
        expect(displays.getDisplayText(k), `row ${target}: display T${k + 1} vs table`).toBe(expected)
      }
      const row = main.rows[target - 1]
      const shown = displays.displayedReading!
      expect(shown !== null, "displays have a reading").toBe(true)
      for (let k = 0; k < 5; k++) expect(row.temps[k], `row ${target} T${k + 1}`).toBe(shown.temps[k])
      expect(row.v4, `row ${target} V4`).toBe(shown.v4)
      expect(row.i4, `row ${target} I4`).toBe(shown.i4)
      expect(row.v5, `row ${target} V5`).toBe(shown.v5)
      expect(row.i5, `row ${target} I5`).toBe(shown.i5)
      expect(row.v4 > 0 && row.i4 > 0 && row.v5 > 0 && row.i5 > 0, "heaters powered while recording").toBe(true)
      expect(row.timeSec, `row ${target} time`).toBe((target - 1) * interval)
      expect(cells[0], `row ${target} time cell`).toBe(String((target - 1) * interval))
      expect(table.getRowText(target - 1)).toBe(table.latestRowText)
      if (target > 1) {
        const gap = t - lastAt
        expect(gap > interval - 0.5 && gap < interval + 0.75, `row gap ${gap.toFixed(2)}s ≈ ${interval}s`).toBe(true)
      }
      lastAt = t
      lastCount = target
    }
    await sleep(200)
  }
}
