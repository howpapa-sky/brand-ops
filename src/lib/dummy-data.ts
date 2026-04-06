import { subDays, format } from 'date-fns'

// 시드 기반 간단한 난수 (일관된 더미 데이터용)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function randomBetween(min: number, max: number, seed: number): number {
  return Math.round(min + seededRandom(seed) * (max - min))
}

// 채널 목록
const CHANNELS = ['cafe24', 'naver', 'coupang', 'coupang_rocket', 'qoo10', 'amazon'] as const
type Channel = (typeof CHANNELS)[number]

const CHANNEL_LABELS: Record<Channel, string> = {
  cafe24: '카페24',
  naver: '네이버',
  coupang: '쿠팡',
  coupang_rocket: '쿠팡로켓',
  qoo10: '큐텐',
  amazon: '아마존',
}

// 하우파파 채널별 일매출 범위
const HOWPAPA_DAILY: Record<Channel, [number, number]> = {
  cafe24: [1500000, 2000000],
  naver: [150000, 250000],
  coupang: [500000, 700000],
  coupang_rocket: [0, 0],
  qoo10: [0, 50000],
  amazon: [0, 30000],
}

// 누씨오 채널별 일매출 범위 (비공구 기간)
const NUCIO_DAILY: Record<Channel, [number, number]> = {
  cafe24: [200000, 350000],
  naver: [50000, 100000],
  coupang: [50000, 150000],
  coupang_rocket: [0, 0],
  qoo10: [0, 0],
  amazon: [0, 0],
}

export interface DailySales {
  date: string
  channel: Channel
  channelLabel: string
  brand: 'howpapa' | 'nucio'
  revenue: number
  orders: number
  costOfGoods: number
}

export interface DummyOrder {
  id: string
  orderDate: string
  channel: Channel
  channelLabel: string
  channelOrderId: string
  brand: 'howpapa' | 'nucio'
  productName: string
  quantity: number
  totalAmount: number
  status: 'confirmed' | 'shipping' | 'delivered' | 'cancelled'
}

export interface DummyAdSpend {
  date: string
  platform: string
  platformLabel: string
  brand: 'howpapa' | 'nucio'
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue: number
}

export interface DummyAlert {
  id: string
  type: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// 상품 목록
const HOWPAPA_PRODUCTS = [
  '하우파파 강아지 유산균',
  '하우파파 관절 영양제',
  '하우파파 피부 영양제',
  '하우파파 눈 영양제',
  '하우파파 종합 영양제',
]

const NUCIO_PRODUCTS = [
  '누씨오 비타민C 세럼',
  '누씨오 히알루론산 앰플',
  '누씨오 레티놀 크림',
  '누씨오 선크림 SPF50',
]

const ORDER_STATUSES: DummyOrder['status'][] = ['confirmed', 'shipping', 'delivered', 'cancelled']

// 30일 일별 매출 데이터 생성
export function generateDailySales(): DailySales[] {
  const data: DailySales[] = []
  const today = new Date()

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = format(subDays(today, dayOffset), 'yyyy-MM-dd')
    const seed = dayOffset * 100

    for (const channel of CHANNELS) {
      // 하우파파
      const hRange = HOWPAPA_DAILY[channel]
      if (hRange[1] > 0) {
        const revenue = randomBetween(hRange[0], hRange[1], seed + CHANNELS.indexOf(channel))
        const avgOrderValue = randomBetween(30000, 60000, seed + 50 + CHANNELS.indexOf(channel))
        data.push({
          date,
          channel,
          channelLabel: CHANNEL_LABELS[channel],
          brand: 'howpapa',
          revenue,
          orders: Math.max(1, Math.round(revenue / avgOrderValue)),
          costOfGoods: Math.round(revenue * 0.3),
        })
      }

      // 누씨오
      const nRange = NUCIO_DAILY[channel]
      if (nRange[1] > 0) {
        const revenue = randomBetween(nRange[0], nRange[1], seed + 200 + CHANNELS.indexOf(channel))
        const avgOrderValue = randomBetween(25000, 45000, seed + 250 + CHANNELS.indexOf(channel))
        data.push({
          date,
          channel,
          channelLabel: CHANNEL_LABELS[channel],
          brand: 'nucio',
          revenue,
          orders: Math.max(1, Math.round(revenue / avgOrderValue)),
          costOfGoods: Math.round(revenue * 0.25),
        })
      }
    }
  }

  return data
}

// 주문 50건 생성
export function generateOrders(): DummyOrder[] {
  const orders: DummyOrder[] = []
  const today = new Date()

  for (let i = 0; i < 50; i++) {
    const dayOffset = randomBetween(0, 14, i * 7)
    const brand = i % 3 === 0 ? 'nucio' : 'howpapa'
    const products = brand === 'howpapa' ? HOWPAPA_PRODUCTS : NUCIO_PRODUCTS
    const channelIdx = randomBetween(0, 3, i * 11) // cafe24, naver, coupang, coupang_rocket
    const channel = CHANNELS[channelIdx]
    const quantity = randomBetween(1, 3, i * 13)
    const unitPrice = brand === 'howpapa'
      ? randomBetween(28000, 58000, i * 17)
      : randomBetween(22000, 42000, i * 17)
    const statusIdx = i < 5 ? 0 : i < 15 ? 1 : i < 45 ? 2 : 3

    orders.push({
      id: `ord-${String(i + 1).padStart(3, '0')}`,
      orderDate: format(subDays(today, dayOffset), 'yyyy-MM-dd'),
      channel,
      channelLabel: CHANNEL_LABELS[channel],
      channelOrderId: `CH${randomBetween(100000000, 999999999, i * 19)}`,
      brand,
      productName: products[randomBetween(0, products.length - 1, i * 23)],
      quantity,
      totalAmount: unitPrice * quantity,
      status: ORDER_STATUSES[statusIdx],
    })
  }

  return orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate))
}

// 광고비 데이터 (30일)
export function generateAdSpends(): DummyAdSpend[] {
  const data: DummyAdSpend[] = []
  const today = new Date()
  const platforms = [
    { key: 'meta', label: '메타 광고' },
    { key: 'naver_sa', label: '네이버 검색광고' },
    { key: 'coupang_ads', label: '쿠팡 광고' },
  ]

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = format(subDays(today, dayOffset), 'yyyy-MM-dd')
    const seed = dayOffset * 300

    // 하우파파 광고
    for (const p of platforms) {
      const spend = p.key === 'meta'
        ? randomBetween(350000, 450000, seed + 1)
        : p.key === 'naver_sa'
          ? randomBetween(50000, 80000, seed + 2)
          : randomBetween(80000, 100000, seed + 3)

      const roas = p.key === 'meta'
        ? randomBetween(250, 400, seed + 4) / 100
        : p.key === 'naver_sa'
          ? randomBetween(300, 500, seed + 5) / 100
          : randomBetween(200, 350, seed + 6) / 100

      data.push({
        date,
        platform: p.key,
        platformLabel: p.label,
        brand: 'howpapa',
        spend,
        impressions: randomBetween(5000, 20000, seed + 10),
        clicks: randomBetween(200, 800, seed + 11),
        conversions: randomBetween(5, 30, seed + 12),
        revenue: Math.round(spend * roas),
      })
    }

    // 누씨오 - 메타만
    const nucioSpend = randomBetween(100000, 200000, seed + 20)
    const nucioRoas = randomBetween(200, 350, seed + 21) / 100
    data.push({
      date,
      platform: 'meta',
      platformLabel: '메타 광고',
      brand: 'nucio',
      spend: nucioSpend,
      impressions: randomBetween(3000, 10000, seed + 22),
      clicks: randomBetween(100, 400, seed + 23),
      conversions: randomBetween(3, 15, seed + 24),
      revenue: Math.round(nucioSpend * nucioRoas),
    })
  }

  return data
}

// 알림 5건
export function generateAlerts(): DummyAlert[] {
  return [
    {
      id: 'alert-1',
      type: 'ad_spend',
      severity: 'warning',
      title: '메타 광고비 급증',
      message: '하우파파 메타 광고비가 전일 대비 25% 증가했습니다.',
      isRead: false,
      createdAt: format(new Date(), 'yyyy-MM-dd HH:mm'),
    },
    {
      id: 'alert-2',
      type: 'roas',
      severity: 'critical',
      title: 'ROAS 급락 경고',
      message: '쿠팡 광고 ROAS가 1.5 이하로 하락했습니다.',
      isRead: false,
      createdAt: format(subDays(new Date(), 1), 'yyyy-MM-dd HH:mm'),
    },
    {
      id: 'alert-3',
      type: 'inventory',
      severity: 'warning',
      title: '재고 부족 알림',
      message: '하우파파 강아지 유산균 재고가 50개 미만입니다.',
      isRead: false,
      createdAt: format(subDays(new Date(), 1), 'yyyy-MM-dd HH:mm'),
    },
    {
      id: 'alert-4',
      type: 'sync',
      severity: 'info',
      title: '쿠팡 주문 동기화 완료',
      message: '15건의 신규 주문이 동기화되었습니다.',
      isRead: true,
      createdAt: format(subDays(new Date(), 2), 'yyyy-MM-dd HH:mm'),
    },
    {
      id: 'alert-5',
      type: 'api_key',
      severity: 'warning',
      title: '쿠팡 API 키 만료 임박',
      message: '쿠팡 API 키가 15일 후 만료됩니다. 갱신이 필요합니다.',
      isRead: false,
      createdAt: format(subDays(new Date(), 3), 'yyyy-MM-dd HH:mm'),
    },
  ]
}

// 집계 헬퍼
export function getTodaySummary(sales: DailySales[], adSpends: DummyAdSpend[], brandFilter: 'all' | 'howpapa' | 'nucio' = 'all') {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  const filterBrand = <T extends { brand: string }>(items: T[]): T[] =>
    brandFilter === 'all' ? items : items.filter((i) => i.brand === brandFilter)

  const todaySales = filterBrand(sales.filter((s) => s.date === today))
  const yesterdaySales = filterBrand(sales.filter((s) => s.date === yesterday))
  const todayAds = filterBrand(adSpends.filter((a) => a.date === today))

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.revenue, 0)
  const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.revenue, 0)
  const todayOrders = todaySales.reduce((sum, s) => sum + s.orders, 0)
  const yesterdayOrders = yesterdaySales.reduce((sum, s) => sum + s.orders, 0)
  const todayAdSpend = todayAds.reduce((sum, a) => sum + a.spend, 0)

  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : 0
  const ordersChange = yesterdayOrders > 0
    ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
    : 0
  const roas = todayAdSpend > 0 ? todayRevenue / todayAdSpend : 0

  return {
    todayRevenue,
    revenueChange,
    todayOrders,
    ordersChange,
    todayAdSpend,
    roas,
  }
}

// 채널별 매출 집계
export function getChannelSummary(
  sales: DailySales[],
  dateFrom: string,
  dateTo: string,
  brandFilter: 'all' | 'howpapa' | 'nucio' = 'all'
) {
  const filtered = sales.filter((s) => {
    const dateMatch = s.date >= dateFrom && s.date <= dateTo
    const brandMatch = brandFilter === 'all' ? true : s.brand === brandFilter
    return dateMatch && brandMatch
  })

  const byChannel: Record<string, { revenue: number; orders: number; howpapa: number; nucio: number }> = {}

  for (const s of filtered) {
    if (!byChannel[s.channelLabel]) {
      byChannel[s.channelLabel] = { revenue: 0, orders: 0, howpapa: 0, nucio: 0 }
    }
    byChannel[s.channelLabel].revenue += s.revenue
    byChannel[s.channelLabel].orders += s.orders
    byChannel[s.channelLabel][s.brand] += s.revenue
  }

  return Object.entries(byChannel).map(([channel, data]) => ({
    channel,
    ...data,
  }))
}

// 일별 트렌드 집계
export function getDailyTrend(sales: DailySales[]) {
  const byDate: Record<string, { date: string; howpapa: number; nucio: number; total: number }> = {}

  for (const s of sales) {
    if (!byDate[s.date]) {
      byDate[s.date] = { date: s.date, howpapa: 0, nucio: 0, total: 0 }
    }
    byDate[s.date][s.brand] += s.revenue
    byDate[s.date].total += s.revenue
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
}

export { CHANNEL_LABELS }
export type { Channel }
