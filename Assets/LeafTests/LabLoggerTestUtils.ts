/**
 * LabLoggerTestUtils — shared lookups/helpers for the Lab Logger LEAF scenarios.
 * Test-only. Reads the Lens's public state; never mutates design/behaviour
 * (the only write is lowering logIntervalSec for speed where a scenario says so).
 */
import {findInteractableByName, getInteractables} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {LabLoggerMain} from "../Scripts/LabLoggerMain"

export const START_STOP_BUTTON = "StartStopButtonFace"
export const NEXT_BUTTON = "NextButton"
export const PREVIOUS_BUTTON = "PreviousButton"
export const HISTORY_SCROLL = "HistoryScroll"

export function getMain(): LabLoggerMain {
  const root = findSceneObjectByName("LabLogger")
  if (!root) throw new Error('Scene object "LabLogger" not found')
  const main = root.getComponent(LabLoggerMain.getTypeName()) as LabLoggerMain
  if (!main) throw new Error("LabLoggerMain component not found on LabLogger")
  return main
}

/** Wait for Lens init (UIKit OnStart + frame-5 re-anchor) and for an interactable to exist. */
export async function waitForLens(): Promise<LabLoggerMain> {
  await sleep(1500)
  const main = getMain()
  await waitUntil(() => !!findInteractableByName(START_STOP_BUTTON, undefined, true), 5000,
    () => `"${START_STOP_BUTTON}" interactable never appeared. Interactables: ` + interactableNames())
  return main
}

export async function waitForInteractable(name: string, timeoutMs: number = 5000): Promise<Interactable> {
  await waitUntil(() => !!findInteractableByName(name, undefined, true), timeoutMs,
    () => `"${name}" interactable not enabled. Interactables: ` + interactableNames())
  return findInteractableByName(name, undefined, true)!
}

export function interactableNames(): string {
  return getInteractables().map((i) => i.getSceneObject().name).join(", ")
}

/** All Text components in a subtree (depth-first). */
export function textsUnder(root: SceneObject): Text[] {
  const out: Text[] = []
  const stack: SceneObject[] = [root]
  while (stack.length > 0) {
    const o = stack.pop()!
    const t = o.getComponent("Component.Text") as Text
    if (t) out.push(t)
    for (let c = 0; c < o.getChildrenCount(); c++) stack.push(o.getChild(c))
  }
  return out
}

/** The visible label text on the Start/Stop button face (from its actual Text component). */
export function visibleStartStopLabel(): string {
  const face = findSceneObjectByName(START_STOP_BUTTON)
  if (!face) return "<no button face>"
  return textsUnder(face).map((t) => t.text).filter((s) => s.length > 0).join(" ")
}

export function textOf(name: string): string {
  const so = findSceneObjectByName(name)
  if (!so) throw new Error(`Text object "${name}" not found`)
  const t = so.getComponent("Component.Text") as Text
  if (!t) throw new Error(`"${name}" has no Text component`)
  return t.text
}

/** Seconds (wall clock of the Lens). */
export function now(): number { return getTime() }

/** Poll `predicate` every frame until true; throws after timeoutMs (LEAF 2.0.2 has no waitUntil). */
export async function waitUntil(predicate: () => boolean, timeoutMs: number, detail?: () => string): Promise<void> {
  const start = getTime()
  while (!predicate()) {
    if ((getTime() - start) * 1000 > timeoutMs) {
      throw new Error(`waitUntil timed out after ${timeoutMs}ms${detail ? ": " + detail() : ""}`)
    }
    await nextFrame()
  }
}
