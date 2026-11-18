import { isRoomPrefix, lookupRoom } from './names'
import type { TextBox } from './types'

export type Box = TextBox & { cx: number; cy: number }
export type LengthMark = Box & { mm: number }
export type AreaMark = Box & { area: number }
export type NameMark = Box & { name: string }

const areaUnit = /^(㎡|m²|m2|平方米|平米)$/
const lengthUnit = /^(mm|cm|米|m)$/

export function readDrawing(boxes: TextBox[]) {
  const merged = clusterLines(boxes.map(toBox)).flatMap(mergeLine)
  const lengths: LengthMark[] = []
  const areas: AreaMark[] = []
  const names: NameMark[] = []

  for (const box of merged) {
    const area = parseArea(box.text)
    if (area) {
      areas.push({ ...box, area })
      continue
    }
    const mm = parseLengthMm(box.text)
    if (mm) {
      lengths.push({ ...box, mm })
      continue
    }
    const name = lookupRoom(box.text)
    if (name) names.push({ ...box, name })
  }

  return { lengths, areas, names }
}

export function compact(text: string) {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, '')
}

function toBox(box: TextBox): Box {
  const text = compact(box.text)
  return { ...box, text, cx: box.x + box.w / 2, cy: box.y + box.h / 2 }
}

function clusterLines(boxes: Box[]) {
  const lines: Box[][] = []
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x)
  for (const box of sorted) {
    let index = -1
    let gap = Number.POSITIVE_INFINITY
    lines.forEach((line, lineIndex) => {
      const anchor = line[0]
      if (!anchor) return
      const nextGap = Math.abs(box.cy - anchor.cy)
      if (nextGap <= Math.max(box.h, anchor.h) * 0.7 && nextGap < gap) {
        index = lineIndex
        gap = nextGap
      }
    })
    if (index >= 0) lines[index]?.push(box)
    else lines.push([box])
  }
  return lines
}

function mergeLine(line: Box[]) {
  const merged: Box[] = []
  for (const token of [...line].sort((a, b) => a.x - b.x)) {
    const prev = merged[merged.length - 1]
    if (prev && canMerge(prev, token)) {
      const right = Math.max(prev.x + prev.w, token.x + token.w)
      const bottom = Math.max(prev.y + prev.h, token.y + token.h)
      prev.x = Math.min(prev.x, token.x)
      prev.y = Math.min(prev.y, token.y)
      prev.w = right - prev.x
      prev.h = bottom - prev.y
      prev.text = compact(prev.text + token.text)
      prev.cx = prev.x + prev.w / 2
      prev.cy = prev.y + prev.h / 2
      continue
    }
    merged.push({ ...token })
  }
  return merged
}

function canMerge(prev: Box, token: Box) {
  const gap = token.x - (prev.x + prev.w)
  if (gap > Math.max(prev.h, token.h) * 0.8) return false
  if (/^\d/.test(prev.text) && (areaUnit.test(token.text) || lengthUnit.test(token.text)))
    return true
  return (
    isCjk(prev.text) &&
    isCjk(token.text) &&
    !lookupRoom(prev.text) &&
    isRoomPrefix(prev.text + token.text)
  )
}

function isCjk(text: string) {
  return /^[\u4e00-\u9fff]+$/.test(text)
}

function parseArea(text: string) {
  const normalized = text.replace(/m²|m2|平方米|平米/g, '㎡')
  const matched = normalized.match(/^(\d+(?:\.\d+)?)㎡$/)
  if (!matched?.[1]) return 0
  const area = Number(matched[1])
  if (!Number.isFinite(area) || area <= 0 || area > 10000) return 0
  return area
}

function parseLengthMm(text: string) {
  if (/[:：/]/.test(text)) return 0
  const matched = text.match(/^(\d+(?:\.\d+)?)(mm|cm|m|米)?$/)
  if (!matched?.[1]) return 0
  const value = Number(matched[1])
  const unit = matched[2]
  if (!Number.isFinite(value)) return 0
  if (unit === 'm' || unit === '米') return value >= 0.3 && value <= 100 ? value * 1000 : 0
  if (unit === 'cm') return value >= 30 && value <= 10000 ? value * 10 : 0
  if (unit === 'mm') return value >= 300 && value <= 100000 ? value : 0
  if (!Number.isInteger(value)) return 0
  const snapped = Math.round(value / 50) * 50
  const mm = value % 10 === 0 ? value : Math.abs(snapped - value) <= 10 ? snapped : 0
  if (mm < 300 || mm > 100000 || mm % 10 !== 0) return 0
  return mm
}
