import type { AreaMark, LengthMark, NameMark } from './read'
import { readDrawing } from './read'
import {
  areaMessage,
  areaStatus,
  type AreaItem,
  type AreaResult,
  type AreaStatus,
  type TextBox,
} from './types'

type Seg = { mm: number; start: number; end: number }
type Region = { area: number; x0: number; y0: number; x1: number; y1: number; name: string }
type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const edge = 0.3

export function calcAreas(boxes: TextBox[]): AreaResult {
  const drawing = readDrawing(boxes)
  if (!drawing.lengths.length && !drawing.areas.length) return fail(areaStatus.noLength)
  if (drawing.areas.length) return fromLabels(drawing.areas, drawing.names)

  const bounds = boundsOf([...drawing.lengths, ...drawing.names, ...drawing.areas])
  const { horizontal, vertical } = classify(drawing.lengths, bounds)
  const xChain = bestChain(horizontal, 'cx')
  const mid = (bounds.minX + bounds.maxX) / 2
  const leftChain = bestChain(
    vertical.filter((mark) => mark.cx < mid),
    'cy',
  )
  const rightChain = bestChain(
    vertical.filter((mark) => mark.cx >= mid),
    'cy',
  )
  const xSegs = toSegments(xChain, 'x')
  const leftSegs = toSegments(leftChain, 'y')
  const rightSegs = toSegments(rightChain, 'y')
  const regions = buildRegions(xSegs, leftSegs, rightSegs).sort(byReading)
  if (regions.length) return fromRegions(regions, drawing.names)

  const width = xChain.length === 1 ? xChain[0].mm : 0
  const height = footprintHeight(leftChain, rightChain)
  if (width && height) {
    return {
      status: areaStatus.ok,
      message: areaMessage.ok,
      total: round2((width * height) / 1_000_000),
      items: [],
      skipped: drawing.names.map((mark) => mark.name),
    }
  }
  return fail(areaStatus.noRegion)
}

export function formatArea(area: number) {
  return `${area.toFixed(2)} m²`
}

export function formatResult(result: AreaResult) {
  if (result.status !== areaStatus.ok) return result.message
  const lines = [`总面积：${formatArea(result.total)}`]
  for (const item of result.items) lines.push(`${item.name}：${formatArea(item.area)}`)
  if (result.skipped.length) lines.push(`未计算：${result.skipped.join('、')}`)
  return lines.join('\n')
}

function fromLabels(areas: AreaMark[], names: NameMark[]): AreaResult {
  const used = new Set<NameMark>()
  const pairs = areas.flatMap((area) =>
    names
      .map((name) => ({ area, name, distance: Math.hypot(area.cx - name.cx, area.cy - name.cy) }))
      .filter((pair) => pair.distance <= Math.max(48, Math.max(pair.area.h, pair.name.h) * 6)),
  )
  pairs.sort((a, b) => a.distance - b.distance)
  const owned = new Map<AreaMark, NameMark>()
  for (const pair of pairs) {
    if (owned.has(pair.area) || used.has(pair.name)) continue
    owned.set(pair.area, pair.name)
    used.add(pair.name)
  }

  const sorted = [...areas].sort((a, b) => a.cy - b.cy || a.cx - b.cx)
  let letter = 0
  const items = numberItems(
    sorted.map((area) => {
      const named = owned.get(area)?.name
      if (named) return { name: named, area: area.area, y: area.cy, x: area.cx }
      const row = { name: letterName(letter), area: area.area, y: area.cy, x: area.cx }
      letter += 1
      return row
    }),
  )
  return ok(
    items,
    names.filter((name) => !used.has(name)).map((name) => name.name),
  )
}

function fromRegions(regions: Region[], names: NameMark[]): AreaResult {
  const usedRegions = new Set<Region>()
  const usedNames = new Set<NameMark>()
  const sortedNames = [...names].sort((a, b) =>
    Math.abs(a.cy - b.cy) > 8 ? a.cy - b.cy : a.cx - b.cx,
  )

  for (const name of sortedNames) {
    const region = pickRegion(regions, usedRegions, name.cx, name.cy, 16)
    if (!region) continue
    region.name = name.name
    usedRegions.add(region)
    usedNames.add(name)
  }

  let letter = 0
  for (const region of regions) {
    if (!region.name) region.name = letterName(letter++)
  }
  const items = numberItems(
    regions.map((region) => ({ name: region.name, area: region.area, y: region.y0, x: region.x0 })),
  )
  return ok(
    items,
    sortedNames.filter((name) => !usedNames.has(name)).map((name) => name.name),
  )
}

function pickRegion(regions: Region[], used: Set<Region>, x: number, y: number, pad: number) {
  let found: Region | undefined
  let area = Number.POSITIVE_INFINITY
  for (const region of regions) {
    if (used.has(region)) continue
    const inside =
      x >= region.x0 - pad && x <= region.x1 + pad && y >= region.y0 - pad && y <= region.y1 + pad
    if (!inside || region.area >= area) continue
    found = region
    area = region.area
  }
  return found
}

function buildRegions(xSegs: Seg[], left: Seg[], right: Seg[]) {
  if (xSegs.length < 2) return []
  const leftOk = left.length >= 2
  const rightOk = right.length >= 2
  if (leftOk && rightOk && !sameChain(left, right)) return splitRegions(xSegs, left, right)
  if (leftOk && rightOk) return grid(xSegs, left)
  const column = leftOk ? xSegs[0] : xSegs[xSegs.length - 1]
  const ySegs = leftOk ? left : right
  return column ? grid([column], ySegs) : []
}

function splitRegions(xSegs: Seg[], left: Seg[], right: Seg[]) {
  let shared = 0
  while (
    shared < left.length &&
    shared < right.length &&
    closeDim(left[shared]?.mm ?? 0, right[shared]?.mm ?? 0)
  ) {
    shared += 1
  }
  const regions: Region[] = []
  for (let index = 0; index < shared; index += 1) {
    const y = unionSeg(left[index], right[index])
    if (y) for (const x of xSegs) pushRect(regions, x, y)
  }
  const first = xSegs[0]
  const last = xSegs[xSegs.length - 1]
  if (first) for (const y of left.slice(shared)) pushRect(regions, first, y)
  if (last && xSegs.length > 1) for (const y of right.slice(shared)) pushRect(regions, last, y)
  return regions
}

function grid(xSegs: Seg[], ySegs: Seg[]) {
  const regions: Region[] = []
  for (const y of ySegs) for (const x of xSegs) pushRect(regions, x, y)
  return regions
}

function pushRect(regions: Region[], x: Seg, y: Seg) {
  if (x.end - x.start < 1 || y.end - y.start < 1) return
  const area = (x.mm * y.mm) / 1_000_000
  if (area < 0.2) return
  regions.push({ area, x0: x.start, y0: y.start, x1: x.end, y1: y.end, name: '' })
}

function unionSeg(left?: Seg, right?: Seg) {
  if (!left) return right
  if (!right) return left
  return {
    mm: left.mm,
    start: Math.min(left.start, right.start),
    end: Math.max(left.end, right.end),
  }
}

function sameChain(left: Seg[], right: Seg[]) {
  return (
    left.length === right.length &&
    left.every((seg, index) => closeDim(seg.mm, right[index]?.mm ?? 0))
  )
}

function footprintHeight(left: LengthMark[], right: LengthMark[]) {
  const leftMm = left.length === 1 ? left[0].mm : 0
  const rightMm = right.length === 1 ? right[0].mm : 0
  if (leftMm && rightMm) return closeDim(leftMm, rightMm) ? leftMm : 0
  return leftMm || rightMm
}

function classify(marks: LengthMark[], bounds: Bounds) {
  const horizontal: LengthMark[] = []
  const vertical: LengthMark[] = []
  const width = Math.max(bounds.maxX - bounds.minX, 1)
  const height = Math.max(bounds.maxY - bounds.minY, 1)
  for (const mark of marks) {
    const dx = Math.min(mark.cx - bounds.minX, bounds.maxX - mark.cx) / width
    const dy = Math.min(mark.cy - bounds.minY, bounds.maxY - mark.cy) / height
    const onX = dy <= edge
    const onY = dx <= edge
    if (onX && !onY) horizontal.push(mark)
    else if (onY && !onX) vertical.push(mark)
    else if (onX && onY) (dx < dy ? vertical : horizontal).push(mark)
  }
  return { horizontal, vertical }
}

function bestChain(marks: LengthMark[], along: 'cx' | 'cy') {
  if (!marks.length) return []
  const groups = clusterMarks(marks, along === 'cx' ? 'cy' : 'cx')
  const maxMm = Math.max(...marks.map((mark) => mark.mm))
  let best: LengthMark[] = []
  for (const group of groups) {
    const chain = dropOverall(dedupe(group, along))
    if (better(chain, best, maxMm)) best = chain
  }
  return best
}

function clusterMarks(marks: LengthMark[], key: 'cx' | 'cy') {
  const sorted = [...marks].sort((a, b) => a[key] - b[key])
  const heights = marks.map((mark) => mark.h).sort((a, b) => a - b)
  const limit = Math.max(18, (heights[Math.floor(heights.length / 2)] ?? 16) * 1.4)
  const groups: LengthMark[][] = []
  for (const mark of sorted) {
    const group = groups[groups.length - 1]
    const anchor = group?.reduce((sum, item) => sum + item[key], 0) ?? 0
    if (!group || Math.abs(mark[key] - anchor / group.length) > limit) groups.push([mark])
    else group.push(mark)
  }
  return groups
}

function dedupe(marks: LengthMark[], along: 'cx' | 'cy') {
  const sorted = [...marks].sort((a, b) => a[along] - b[along])
  const result: LengthMark[] = []
  for (const mark of sorted) {
    const prev = result[result.length - 1]
    if (prev && prev.mm === mark.mm && Math.abs(prev[along] - mark[along]) < 20) continue
    result.push(mark)
  }
  return result
}

function dropOverall(marks: LengthMark[]) {
  if (marks.length < 3) return marks
  const sizes = marks.map((mark) => mark.mm).sort((a, b) => b - a)
  const largest = sizes[0] ?? 0
  const second = sizes[1] ?? 0
  const others = sumMm(marks) - largest
  if (largest < second * 1.8 || largest + 800 < others) return marks
  const index = marks.findIndex((mark) => mark.mm === largest)
  return index < 0 ? marks : marks.filter((_, markIndex) => markIndex !== index)
}

function toSegments(chain: LengthMark[], axis: 'x' | 'y'): Seg[] {
  if (chain.length < 2) return []
  const key = axis === 'x' ? 'cx' : 'cy'
  const sorted = [...chain].sort((a, b) => a[key] - b[key])
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (!first || !last) return []
  const spanPx = last[key] - first[key]
  const spanMm = sumMm(sorted) - first.mm / 2 - last.mm / 2
  if (spanPx < 8 || spanMm <= 0) return []
  const scale = spanPx / spanMm
  const origin = first[key] - (first.mm / 2) * scale
  let acc = 0
  return sorted.map((mark) => {
    const start = origin + acc * scale
    acc += mark.mm
    return { mm: mark.mm, start, end: origin + acc * scale }
  })
}

function numberItems(
  items: Array<{ name: string; area: number; y: number; x: number }>,
): AreaItem[] {
  const count = new Map<string, number>()
  for (const item of items) {
    if (!item.name) continue
    count.set(item.name, (count.get(item.name) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  return items.map((item) => {
    const name = item.name || letterName(0)
    const total = count.get(name) ?? 1
    if (total < 2) return { name, area: round2(item.area) }
    const index = (seen.get(name) ?? 0) + 1
    seen.set(name, index)
    return { name: `${name}${index}`, area: round2(item.area) }
  })
}

function letterName(index: number) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return alphabet[index] ?? `A${index - alphabet.length + 1}`
}

function boundsOf(marks: Array<{ x: number; y: number; w: number; h: number }>): Bounds {
  const first = marks[0]
  const bounds = {
    minX: first?.x ?? 0,
    minY: first?.y ?? 0,
    maxX: (first?.x ?? 0) + (first?.w ?? 0),
    maxY: (first?.y ?? 0) + (first?.h ?? 0),
  }
  for (const mark of marks) {
    bounds.minX = Math.min(bounds.minX, mark.x)
    bounds.minY = Math.min(bounds.minY, mark.y)
    bounds.maxX = Math.max(bounds.maxX, mark.x + mark.w)
    bounds.maxY = Math.max(bounds.maxY, mark.y + mark.h)
  }
  return bounds
}

function byReading(a: Region, b: Region) {
  if (Math.abs(a.y0 - b.y0) > 8) return a.y0 - b.y0
  return a.x0 - b.x0
}

function better(next: LengthMark[], current: LengthMark[], maxMm: number) {
  if (!current.length) return next.length > 0
  if (next.length !== current.length) return next.length > current.length
  const nextGap = Math.abs(sumMm(next) - maxMm)
  const currentGap = Math.abs(sumMm(current) - maxMm)
  if (nextGap !== currentGap) return nextGap < currentGap
  return sumMm(next) > sumMm(current)
}

function sumMm(marks: Array<{ mm: number }>) {
  return marks.reduce((sum, mark) => sum + mark.mm, 0)
}

function closeDim(a: number, b: number) {
  const diff = Math.abs(a - b)
  return diff <= 50 || diff / Math.max(a, b, 1) <= 0.02
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function ok(items: AreaItem[], skipped: string[]): AreaResult {
  return {
    status: areaStatus.ok,
    message: areaMessage.ok,
    total: round2(items.reduce((sum, item) => sum + item.area, 0)),
    items,
    skipped,
  }
}

function fail(status: Exclude<AreaStatus, typeof areaStatus.ok>): AreaResult {
  return { status, message: areaMessage[status], total: 0, items: [], skipped: [] }
}
