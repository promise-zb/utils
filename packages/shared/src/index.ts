export const tools = [
  {
    id: 'floor-area',
    name: '图纸面积计算',
    path: '/tools/floor-area',
    summary: '识别图纸上的长度并计算面积',
  },
  {
    id: 'sign',
    name: '签名助手',
    path: '/tools/sign',
    summary: '给 PDF 手写签名，文件只在本机',
  },
] as const

export type ToolId = (typeof tools)[number]['id']
