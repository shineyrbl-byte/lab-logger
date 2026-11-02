/**
 * LabLoggerStyleUI — shared UI helpers for the Lab Logger UI modules.
 *
 * Owns:   the Specs type scale (applyTextRole / roleSize) and the UIKit layout
 *         composition helpers (obj / flexColumn / flexRow / flexChild / text cells / icon images)
 *         used by every LabLogger*UI.ts module, so all panels share one look.
 * Must not: hold any state or be attached to a SceneObject — plain functions only.
 *           Only *UI.ts modules may import this file (Hard Rule 3).
 */
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"

const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material

// ── Typography: the single source of truth for text size + weight ────────────
// Text.size is the em-square height (cm = size / 43.886), calibrated for the
// SnapOS system font at z = -110 cm. Pick a role, never a raw number.
export const FONT_SIZE_SCALE = 1.0

export type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"

const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700},
  Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700},
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500},
  Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}

export function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}

export function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

// ── Z lifts (local +Z = toward the viewer) ───────────────────────────────────
export const PANEL_CONTENT_Z = 0.6
export const LAYOUT_Z_LIFT = 0.02
export const BUTTON_LABEL_Z = 0.08

// ── SceneObject helpers ──────────────────────────────────────────────────────
export function obj(parent: SceneObject, name: string, position?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (position) so.getTransform().setLocalPosition(position)
  return so
}

export function liftInZ(so: SceneObject, z: number): void {
  const t = so.getTransform()
  const p = t.getLocalPosition()
  t.setLocalPosition(new vec3(p.x, p.y, p.z + z))
}

export interface FlexOpts {
  gap?: number
  padY?: number
  padX?: number
  justify?: FlexJustify
  align?: FlexAlign
}

/** Create a flex container SceneObject (with its own FlexItem so a parent layout can place it). */
export function makeFlex(parent: SceneObject, name: string, direction: FlexDirection,
                         width: number, height: number, opts?: FlexOpts): SceneObject {
  const container = obj(parent, name)
  liftInZ(container, LAYOUT_Z_LIFT)
  const flex = container.createComponent(FlexLayout.getTypeName()) as FlexLayout
  // Children are registered explicitly via addItems (UIKit 2 throws on pre-init addItems otherwise).
  flex.autoDiscoverItemsOnStart = false
  const item = container.createComponent(FlexItem.getTypeName()) as FlexItem
  if (width > 0) item.overrideWidth = width
  if (height > 0) item.overrideHeight = height
  flex.onInitialized.add(() => {
    flex.width = width
    flex.height = height
    flex.direction = direction
    if (direction === FlexDirection.Row) flex.columnGap = opts?.gap ?? 0
    else flex.rowGap = opts?.gap ?? 0
    flex.paddingTop = opts?.padY ?? 0
    flex.paddingBottom = opts?.padY ?? 0
    flex.paddingLeft = opts?.padX ?? 0
    flex.paddingRight = opts?.padX ?? 0
    flex.justifyContent = opts?.justify ?? FlexJustify.Start
    flex.alignItems = opts?.align ?? FlexAlign.Stretch
  })
  register(parent, item)
  return container
}

export function flexRow(parent: SceneObject, name: string, w: number, h: number, opts?: FlexOpts): SceneObject {
  return makeFlex(parent, name, FlexDirection.Row, w, h, opts)
}

export function flexColumn(parent: SceneObject, name: string, w: number, h: number, opts?: FlexOpts): SceneObject {
  return makeFlex(parent, name, FlexDirection.Column, w, h, opts)
}

/** Register a FlexItem with its parent's FlexLayout (mandatory — or children stack at the origin). */
export function register(parent: SceneObject, item: FlexItem): void {
  const parentFlex = parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null
  if (parentFlex) parentFlex.addItems([item])
}

/** A fixed-size flex child; `builder` composes its content. */
export function flexChild(parent: SceneObject, name: string, size: {w?: number; h?: number; grow?: number},
                          builder?: (child: SceneObject) => void): SceneObject {
  const child = obj(parent, name)
  liftInZ(child, LAYOUT_Z_LIFT)
  const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
  if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
  if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
  item.flexGrow = size.grow ?? 0
  item.flexShrink = 0
  if (builder) builder(child)
  register(parent, item)
  return child
}

function baseText(so: SceneObject, value: string, role: TextRole, color: vec4,
                  align: HorizontalAlignment): Text {
  const t = so.createComponent("Component.Text") as Text
  t.text = value
  t.depthTest = true
  applyTextRole(t, role)
  t.horizontalAlignment = align
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = HorizontalOverflow.Overflow
  t.verticalOverflow = VerticalOverflow.Overflow
  t.textFill.color = color
  return t
}

/**
 * Text cell inside a ROW (has siblings) — rect sized to `widthCm` so FlexLayout
 * reserves real width (patterns.md → addRowText).
 */
export function rowText(parent: SceneObject, name: string, value: string, role: TextRole,
                        widthCm: number, color: vec4,
                        align: HorizontalAlignment = HorizontalAlignment.Center,
                        heightCm: number = 2.4): Text {
  const so = obj(parent, name)
  liftInZ(so, LAYOUT_Z_LIFT)
  const t = baseText(so, value, role, color, align)
  t.layoutRect = Rect.create(-widthCm / 2, widthCm / 2, -heightCm / 2, heightCm / 2)
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideWidth = widthCm
  item.overrideHeight = heightCm
  register(parent, item)
  return t
}

/** Full-width text line inside a COLUMN (alignSelf = Stretch so centering works). */
export function columnText(parent: SceneObject, name: string, value: string, role: TextRole,
                           heightCm: number, color: vec4,
                           align: HorizontalAlignment = HorizontalAlignment.Center): Text {
  const so = obj(parent, name)
  liftInZ(so, LAYOUT_Z_LIFT)
  const t = baseText(so, value, role, color, align)
  t.layoutRect = Rect.create(-0.5, 0.5, -0.5, 0.5)
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
  item.alignSelf = FlexAlignSelf.Stretch
  item.overrideHeight = heightCm
  register(parent, item)
  return t
}

/** Label drawn on a Button face (lifted in Z so the face doesn't clip its first glyph). */
export function buttonLabel(parent: SceneObject, value: string, widthCm: number, role: TextRole,
                            color: vec4): Text {
  const so = obj(parent, "ButtonLabel", new vec3(0, 0, BUTTON_LABEL_Z))
  const t = baseText(so, value, role, color, HorizontalAlignment.Center)
  t.layoutRect = Rect.create(-widthCm / 2, widthCm / 2, -1.2, 1.2)
  return t
}

/** Icon image as a flex item (Image sized by localScale; cloned ImageMaterial). */
export function iconImage(parent: SceneObject, name: string, texture: Texture, sizeCm: number,
                          tint?: vec4): Image {
  const so = obj(parent, name)
  liftInZ(so, LAYOUT_Z_LIFT)
  const img = so.createComponent("Component.Image") as Image
  const mat = imageMaterial.clone()
  mat.mainPass.baseTex = texture
  if (tint) mat.mainPass.baseColor = tint
  mat.mainPass.depthTest = true
  mat.mainPass.depthWrite = false
  img.clearMaterials()
  img.addMaterial(mat)
  so.getTransform().setLocalScale(new vec3(sizeCm, sizeCm, 1))
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideWidth = sizeCm
  item.overrideHeight = sizeCm
  register(parent, item)
  return img
}

export function vec4FromVec3(c: vec3, a: number = 1): vec4 {
  return new vec4(c.x, c.y, c.z, a)
}
