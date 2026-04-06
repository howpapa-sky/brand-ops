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
import {
  generateDailySales,
  generateOrders,
  generateAdSpends,
  generateAlerts,
  getTodaySummary,
  getChannelSummary,
  getDailyTrend,
} from '@/lib/dummy-data'
import { format } from 'date-fns'

export function DashboardClient() {
  const { selectedBrand } = useBrand()

  const sales = useMemo(() => generateDailySales(), [])
  const orders = useMemo(() => generateOrders(), [])
  const adSpends = useMemo(() => generateAdSpends(), [])
  const alerts = useMemo(() => generateAlerts(), [])

  const summary = useMemo(
    () => getTodaySummary(sales, adSpends, selectedBrand),
    [sales, adSpends, selectedBrand]
  )

  const today = format(new Date(), 'yyyy-MM-dd')
  const channelData = useMemo(
    () => getChannelSummary(sales, today, today, selectedBrand),
    [sales, today, selectedBrand]
  )

  const trendData = useMemo(() => getDailyTrend(sales), [sales])

  const filteredOrders = useMemo(() => {
    const filtered =
      selectedBrand === 'all'
        ? orders
        : orders.filter((o) => o.brand === selectedBrand)
    return filtered.slice(0, 10)
  }, [orders, selectedBrand])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="오늘 매출"
          value={formatKRW(summary.todayRevenue)}
          change={summary.revenueChange}
          icon={TrendingUp}
        />
        <StatsCard
          label="오늘 주문"
          value={`${formatNumber(summary.todayOrders)}건`}
          change={summary.ordersChange}
          icon={ShoppingCart}
        />
        <StatsCard
          label="광고비"
          value={formatKRW(summary.todayAdSpend)}
          icon={Megaphone}
        />
        <StatsCard
          label="ROAS"
          value={summary.roas > 0 ? `${summary.roas.toFixed(1)}x` : '-'}
          icon={Target}
        />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChannelBarChart data={channelData} brandFilter={selectedBrand} />
        <DailyTrendChart data={trendData} />
      </div>

      {/* 주문 + 알림 + 동기화 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentOrders orders={filteredOrders} />
        </div>
        <div className="space-y-4">
          <SyncPanel />
          <AlertsList alerts={alerts} />
        </div>
      </div>
    </div>
  )
}
