/**
 * LabLoggerData — shared data types, the scripted heat-transfer sample model,
 * number formatting, and the seven graph definitions.
 *
 * Owns:   pure logic only (no scene access, no UIKit, no Component.Text).
 * Inputs: none — LabLoggerMain passes the tunable model parameters in.
 * Must not: touch SceneObjects or hold UI state.
 *
 * The model stands in for the five real temperature sensors (T1–T5) and the
 * two heater power supplies attached to T4 and T5. Temperatures rise from
 * ambient toward a steady state like a first-order heat-transfer run:
 *   T(t) = T_amb + dT * (1 - exp(-t / tau)) + small deterministic flicker
 * Each heater runs at a nearly constant voltage; its element resistance grows
 * with temperature (R = R0 * (1 + alpha * (T - T_amb))), so current I = V / R
 * falls slightly as the run heats up.
 */

/** One instantaneous set of instrument values (what the displays show). */
export interface Reading {
  /** Seconds since recording started (0 before Start). */
  timeSec: number
  /** T1..T5 in °C. */
  temps: number[]
  /** Heater on T4: voltage (V) and current (A). */
  v4: number
  i4: number
  /** Heater on T5: voltage (V) and current (A). */
  v5: number
  i5: number
}

/** One logged observation-table row (a frozen copy of a Reading). */
export type LogRow = Reading

export interface SampleModelParams {
  ambientC: number
  /** Temperature rise at steady state for T1..T5 (°C). */
  riseC: number[]
  /** Time constants for T1..T5 (s). */
  tauSec: number[]
  heater1Volts: number
  heater2Volts: number
  heater1ColdOhms: number
  heater2ColdOhms: number
}

/** Temperature coefficient of resistance (≈ nichrome/copper mix), 1/°C. */
const ALPHA_PER_C = 0.0039

export const DEFAULT_MODEL: SampleModelParams = {
  ambientC: 25,
  riseC: [8, 17, 29, 56, 47],
  tauSec: [140, 115, 95, 70, 80],
  heater1Volts: 12.0,
  heater2Volts: 10.0,
  heater1ColdOhms: 8.0,
  heater2ColdOhms: 6.5,
}

/**
 * Evaluate the scripted sample data at `t` seconds into a run.
 * `heatersOn = false` returns the idle (ambient, 0 V / 0 A) state shown before Start.
 */
export function sampleAt(t: number, heatersOn: boolean, m: SampleModelParams): Reading {
  const temps: number[] = []
  for (let k = 0; k < 5; k++) {
    // small deterministic sensor flicker (±~0.15 °C) so displays look alive
    const flicker = 0.1 * Math.sin(0.9 * t + k * 1.7) + 0.05 * Math.sin(2.3 * t + k * 0.6)
    const rise = heatersOn ? m.riseC[k] * (1 - Math.exp(-t / m.tauSec[k])) : 0
    temps.push(round1(m.ambientC + rise + flicker))
  }
  let v4 = 0, i4 = 0, v5 = 0, i5 = 0
  if (heatersOn) {
    v4 = round2(m.heater1Volts + 0.04 * Math.sin(0.37 * t))
    v5 = round2(m.heater2Volts + 0.04 * Math.sin(0.29 * t + 1.1))
    const r4 = m.heater1ColdOhms * (1 + ALPHA_PER_C * (temps[3] - m.ambientC))
    const r5 = m.heater2ColdOhms * (1 + ALPHA_PER_C * (temps[4] - m.ambientC))
    i4 = round3(v4 / r4)
    i5 = round3(v5 / r5)
  }
  return {timeSec: Math.round(t), temps, v4, i4, v5, i5}
}

export function copyReading(r: Reading): Reading {
  return {timeSec: r.timeSec, temps: r.temps.slice(), v4: r.v4, i4: r.i4, v5: r.v5, i5: r.i5}
}

function round1(x: number): number { return Math.round(x * 10) / 10 }
function round2(x: number): number { return Math.round(x * 100) / 100 }
function round3(x: number): number { return Math.round(x * 1000) / 1000 }

// ── Formatting (shared by displays, table, and graphs so values always match) ──
export function fmtTemp(c: number): string { return c.toFixed(1) }
export function fmtVolt(v: number): string { return v.toFixed(2) }
export function fmtAmp(a: number): string { return a.toFixed(3) }
export function fmtOhm(r: number): string { return r.toFixed(2) }

/** Table column values for one row, in column order. */
export function rowCells(r: LogRow): string[] {
  return [
    String(r.timeSec),
    fmtTemp(r.temps[0]), fmtTemp(r.temps[1]), fmtTemp(r.temps[2]),
    fmtTemp(r.temps[3]), fmtTemp(r.temps[4]),
    fmtVolt(r.v4), fmtAmp(r.i4), fmtVolt(r.v5), fmtAmp(r.i5),
  ]
}

export const TABLE_HEADERS: string[] = [
  "Time (s)", "T1 (°C)", "T2 (°C)", "T3 (°C)", "T4 (°C)", "T5 (°C)",
  "V4 (V)", "I4 (A)", "V5 (V)", "I5 (A)",
]

// ── Graphs ─────────────────────────────────────────────────────────────────
export interface GraphSeries {
  label: string
  unit: string
  /** 0 = left axis, 1 = right axis. */
  axis: 0 | 1
  /** Color slot index (UI decides the actual color). */
  colorSlot: number
  values: number[]
}

export interface GraphSpec {
  title: string
  xLabel: string
  times: number[]
  series: GraphSeries[]
}

export const GRAPH_COUNT = 7

/** Resistance = V / I (Ω); 0 when no current flows. */
export function resistance(v: number, i: number): number {
  return i > 1e-6 ? v / i : 0
}

/**
 * Build graph `index` (0..6) from recorded rows.
 * 0..4 → temperature distribution of T1..T5 vs time.
 * 5..6 → heater on T4 / T5: voltage (left axis) and resistance V/I (right axis) vs time.
 */
export function buildGraph(index: number, rows: LogRow[]): GraphSpec {
  const times = rows.map((r) => r.timeSec)
  if (index < 5) {
    return {
      title: `T${index + 1} temperature vs time`,
      xLabel: "Time (s)",
      times,
      series: [{label: `T${index + 1}`, unit: "°C", axis: 0, colorSlot: 0, values: rows.map((r) => r.temps[index])}],
    }
  }
  const dev = index === 5 ? 4 : 5
  const v = rows.map((r) => (dev === 4 ? r.v4 : r.v5))
  const i = rows.map((r) => (dev === 4 ? r.i4 : r.i5))
  return {
    title: `Heater on T${dev}: voltage & resistance vs time`,
    xLabel: "Time (s)",
    times,
    series: [
      {label: `V${dev}`, unit: "V", axis: 0, colorSlot: 0, values: v},
      {label: `R${dev} = V/I`, unit: "Ω", axis: 1, colorSlot: 1, values: v.map((vv, k) => resistance(vv, i[k]))},
    ],
  }
}

/** Nice axis range with `ticks` evenly spaced values (min, ..., max). */
export function niceRange(values: number[], ticks: number): {min: number; max: number; step: number} {
  let lo = Infinity, hi = -Infinity
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v }
  if (!isFinite(lo)) { lo = 0; hi = 1 }
  if (hi - lo < 1e-6) { lo -= 0.5; hi += 0.5 }
  const rawStep = (hi - lo) / (ticks - 1)
  const mag = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10))
  const norm = rawStep / mag
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10
  const step = niceNorm * mag
  const min = Math.floor(lo / step) * step
  let max = min + step * (ticks - 1)
  while (max < hi - 1e-9) { max += step }
  return {min, max, step: (max - min) / (ticks - 1)}
}

export function fmtTick(v: number, step: number): string {
  if (step >= 1) return String(Math.round(v))
  if (step >= 0.1) return v.toFixed(1)
  return v.toFixed(2)
}
