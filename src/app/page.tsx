import { prisma } from '@/lib/prisma'
import { DashboardClient, type DashboardData } from '@/components/dashboard/DashboardClient'
import { CHANNEL_NAMES } from '@/lib/constants'
import { format, subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const thirtyDaysAgo = subDays(today, 30)

  // 오늘 매출/주문
  const todayAgg = await prisma.order.aggregate({
    where: { orderDate: { gte: today, lt: tomorrow } },
    _sum: { totalAmount: true },
    _count: true,
  })

  // 어제 매출/주문 (변화율 계산용)
  const yesterdayAgg = await prisma.order.aggregate({
    where: { orderDate: { gte: yesterday, lt: today } },
    _sum: { totalAmount: true },
    _count: true,
  })

  // 오늘 광고비
  const todayAds = await prisma.adSpend.aggregate({
    where: { date: { gte: today, lt: tomorrow } },
    _sum: { spend: true },
  })

  // 채널별 매출 (오늘)
  const channelOrders = await prisma.order.groupBy({
    by: ['channel', 'brandId'],
    where: { orderDate: { gte: today, lt: tomorrow } },
    _sum: { totalAmount: true },
    _count: true,
  })

  // Brand ID → code 매핑
  const brands = await prisma.brand.findMany()
  const brandIdToCode = new Map(brands.map((b) => [b.id, b.code]))

  // 채널 집계
  const channelMap: Record<string, { channel: string; howpapa: number; nucio: number; revenue: number; orders: number }> = {}
  for (const row of channelOrders) {
    const channelLabel = CHANNEL_NAMES[row.channel] ?? row.channel
    if (!channelMap[channelLabel]) {
      channelMap[channelLabel] = { channel: channelLabel, howpapa: 0, nucio: 0, revenue: 0, orders: 0 }
    }
    const amount = row._sum.totalAmount ?? 0
    const brandCode = brandIdToCode.get(row.brandId) ?? ''
    channelMap[channelLabel].revenue += amount
    channelMap[channelLabel].orders += row._count
    if (brandCode === 'howpapa') channelMap[channelLabel].howpapa += amount
    if (brandCode === 'nucio') channelMap[channelLabel].nucio += amount
  }

  // 30일 일별 트렌드
  const dailyOrders = await prisma.order.groupBy({
    by: ['brandId'],
    where: { orderDate: { gte: thirtyDaysAgo } },
    _sum: { totalAmount: true },
  })

  // 일별 상세 (raw query 대신 개별 집계)
  const allOrders30d = await prisma.order.findMany({
    where: { orderDate: { gte: thirtyDaysAgo } },
    select: { orderDate: true, totalAmount: true, brandId: true },
  })

  const dailyMap: Record<string, { date: string; howpapa: number; nucio: number; total: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    dailyMap[d] = { date: d, howpapa: 0, nucio: 0, total: 0 }
  }
  for (const o of allOrders30d) {
    const d = format(o.orderDate, 'yyyy-MM-dd')
    if (!dailyMap[d]) continue
    const brandCode = brandIdToCode.get(o.brandId) ?? ''
    dailyMap[d].total += o.totalAmount
    if (brandCode === 'howpapa') dailyMap[d].howpapa += o.totalAmount
    if (brandCode === 'nucio') dailyMap[d].nucio += o.totalAmount
  }

  // 최근 주문 10건
  const recentOrders = await prisma.order.findMany({
    orderBy: { orderDate: 'desc' },
    take: 20,
    include: { items: true },
  })

  const mappedOrders = recentOrders.map((o) => ({
    id: o.id,
    orderDate: format(o.orderDate, 'yyyy-MM-dd'),
    channel: o.channel as 'cafe24' | 'naver' | 'coupang' | 'coupang_rocket' | 'qoo10' | 'amazon',
    channelLabel: CHANNEL_NAMES[o.channel] ?? o.channel,
    channelOrderId: o.channelOrderId,
    brand: (brandIdToCode.get(o.brandId) ?? 'howpapa') as 'howpapa' | 'nucio',
    productName: o.items[0]?.productName ?? '상품',
    quantity: o.items.reduce((sum, i) => sum + i.quantity, 0),
    totalAmount: o.totalAmount,
    status: mapOrderStatus(o.status),
  }))

  // 알림
  const alertRows = await prisma.alert.findMany({
    where: { isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const alerts = alertRows.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity as 'info' | 'warning' | 'critical',
    title: a.title,
    message: a.message,
    isRead: a.isRead,
    createdAt: format(a.createdAt, 'yyyy-MM-dd HH:mm'),
  }))

  const data: DashboardData = {
    todayRevenue: todayAgg._sum.totalAmount ?? 0,
    todayOrders: todayAgg._count,
    yesterdayRevenue: yesterdayAgg._sum.totalAmount ?? 0,
    yesterdayOrders: yesterdayAgg._count,
    todayAdSpend: todayAds._sum.spend ?? 0,
    channelSummary: Object.values(channelMap),
    dailyTrend: Object.values(dailyMap),
    recentOrders: mappedOrders,
    alerts,
    hasRealData: dailyOrders.length > 0 || recentOrders.length > 0,
  }

  return <DashboardClient data={data} />
}

function mapOrderStatus(status: string): 'confirmed' | 'shipping' | 'delivered' | 'cancelled' {
  const s = status.toUpperCase()
  if (s.includes('CANCEL') || s.includes('RETURN') || s.includes('취소')) return 'cancelled'
  if (s.includes('DELIVER') || s.includes('FINAL') || s.includes('배송완료') || s === 'N40') return 'delivered'
  if (s.includes('DEPARTURE') || s.includes('SHIP') || s.includes('배송')) return 'shipping'
  return 'confirmed'
}
