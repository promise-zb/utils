export type TextBox = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

export const areaStatus = {
  ok: 'ok',
  noLength: 'no-length',
  noRegion: 'no-region',
} as const

export type AreaStatus = (typeof areaStatus)[keyof typeof areaStatus]

export const areaMessage = {
  ok: '',
  'no-length': '没有长度，无需计算',
  'no-region': '识别到长度，但没有可计算的区域',
} as const

export type AreaItem = {
  name: string
  area: number
}

export type AreaResult = {
  status: AreaStatus
  message: string
  total: number
  items: AreaItem[]
  skipped: string[]
}
