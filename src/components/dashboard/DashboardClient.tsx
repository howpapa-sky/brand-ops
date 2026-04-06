'use client'

import { useMemo } from 'react'
import { StatsCard } from '@/components/common/StatsCard'
import { ChannelBarChart } from './ChannelBarChart'
import { DailyTrendChart } from './DailyTrendChart'
import { RecentOrders } from './RecentOrders'
import { AlertsList } from './AlertsList'
import { SyncPanel } from './SyncPanel'
import { useBrand } from '@/hooks/useBrand'
import { formatKRW, formatNumber } from '@/lib/format'
import { TrendingUp, ShoppingCart, Megaphone, Target } from 'lucide-react'
import type { DummyOrder, DummyAlert } from '@/lib/dummy-data'

export interface DashboardData {
  todayRevenue: number
  todayOrders: number
  yesterdayRevenue: number
  yesterdayOrders: number
  todayAdSpend: number
  channelSummary: { channel: string; howpapa: number; nucio: number; revenue: number; orders: number }[]
  dailyTrend: { date: string; howpapa: number; nucio: number; total: number }[]
  recentOrders: DummyOrder[]
  alerts: DummyAlert[]
  hasRealData: boolean
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { selectedBrand } = useBrand()

  const revenueChange = data.yesterdayRevenue > 0
    ? ((data.todayRevenue - data.yesterdayRevenue) / data.yesterdayRevenue) * 100
    : 0

  const ordersChange = data.yesterdayOrders > 0
    ? ((data.todayOrders - data.yesterdayOrders) / data.yesterdayOrders) * 100
    : 0

  const roas = data.todayAdSpend > 0 ? data.todayRevenue / data.todayAdSpend : 0

  const filteredOrders = useMemo(() => {
    if (selectedBrand === 'all') return data.recentOrders
    return data.recentOrders.filter((o) => o.brand === selectedBrand)
  }, [data.recentOrders, selectedBrand])

  const filteredChannelData = useMemo(() => {
    if (selectedBrand === 'all') return data.channelSummary
    return data.channelSummary.map((ch) => ({
      ...ch,
      revenue: selectedBrand === 'howpapa' ? ch.howpapa : ch.nucio,
    }))
  }, [data.channelSummary, selectedBrand])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="오늘 매출"
          value={formatKRW(data.todayRevenue)}
          change={revenueChange}
          icon={TrendingUp}
        />
        <StatsCard
          label="오늘 주문"
          value={`${formatNumber(data.todayOrders)}건`}
          change={ordersChange}
          icon={ShoppingCart}
        />
        <StatsCard
          label="광고비"
          value={formatKRW(data.todayAdSpend)}
          icon={Megaphone}
        />
        <StatsCard
          label="ROAS"
          value={roas > 0 ? `${roas.toFixed(1)}x` : '-'}
          icon={Target}
        />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChannelBarChart data={filteredChannelData} brandFilter={selectedBrand} />
        <DailyTrendChart data={data.dailyTrend} />
      </div>

      {/* 주문 + 동기화 + 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentOrders orders={filteredOrders.slice(0, 10)} />
        </div>
        <div className="space-y-4">
          <SyncPanel />
          <AlertsList alerts={data.alerts} />
        </div>
      </div>
    </div>
  )
}
