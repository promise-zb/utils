export const roomName = {
  卧室: '卧室',
  主卧: '主卧',
  次卧: '次卧',
  儿童房: '儿童房',
  老人房: '老人房',
  客房: '客房',
  客厅: '客厅',
  餐厅: '餐厅',
  客餐厅: '客餐厅',
  起居室: '起居室',
  厨房: '厨房',
  卫生间: '卫生间',
  洗手间: '洗手间',
  浴室: '浴室',
  公卫: '公卫',
  客卫: '客卫',
  主卫: '主卫',
  储物间: '储物间',
  储藏室: '储藏室',
  储藏间: '储藏间',
  阳台: '阳台',
  露台: '露台',
  飘窗: '飘窗',
  平台: '平台',
  堂屋: '堂屋',
  门厅: '门厅',
  玄关: '玄关',
  过道: '过道',
  走廊: '走廊',
  过厅: '过厅',
  棋牌室: '棋牌室',
  书房: '书房',
  车库: '车库',
  工人房: '工人房',
  楼梯间: '楼梯间',
  电梯间: '电梯间',
  电梯: '电梯',
  天井: '天井',
  单间: '单间',
  房间: '房间',
  厅: '厅',
  茶室: '茶室',
  衣帽间: '衣帽间',
  影音室: '影音室',
} as const

const roomKeys = Object.keys(roomName)

export function lookupRoom(text: string) {
  if (text in roomName) return roomName[text as keyof typeof roomName]
  return ''
}

export function isRoomPrefix(text: string) {
  return text.length > 0 && roomKeys.some((name) => name.startsWith(text))
}
