'use client'

import { useMemo, useState } from 'react'
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatsCard } from '@/components/common/StatsCard'
import { useBrand } from '@/hooks/useBrand'
import { formatKRW, formatNumber, formatPercent } from '@/lib/format'
import { calcGrossProfit, calcContributionProfit, calcNetProfit, calcChannelFee } from '@/lib/profit'
import { downloadCSV } from '@/lib/csv'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { Download, ArrowUpDown } from 'lucide-react'
import {
  generateDailySales,
  generateOrders,
  generateAdSpends,
  getChannelSummary,
  type DummyOrder,
  type Channel,
} from '@/lib/dummy-data'
import { cn } from '@/lib/utils'

type DatePreset = 'today' | 'week' | 'month' | 'custom'
type ChannelFilter = 'all' | Channel
type SortKey = 'orderDate' | 'totalAmount' | 'quantity'

const STATUS_CONFIG: Record<
  DummyOrder['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  confirmed: { label: '주문확인', variant: 'default' },
  shipping: { label: '배송중', variant: 'secondary' },
  delivered: { label: '배송완료', variant: 'outline' },
  cancelled: { label: '취소', variant: 'destructive' },
}

const CHANNEL_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'cafe24', label: '카페24' },
  { value: 'coupang', label: '쿠팡' },
  { value: 'naver', label: '네이버' },
  { value: 'qoo10', label: '큐텐' },
  { value: 'amazon', label: '아마존' },
]

export function SalesClient() {
  const { selectedBrand } = useBrand()
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('orderDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const pageSize = 20

  const sales = useMemo(() => generateDailySales(), [])
  const orders = useMemo(() => generateOrders(), [])
  const adSpends = useMemo(() => generateAdSpends(), [])

  const today = format(new Date(), 'yyyy-MM-dd')
  const dateRange = useMemo(() => {
    switch (datePreset) {
      case 'today':
        return { from: today, to: today }
      case 'week':
        return { from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: today }
      case 'month':
        return { from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: today }
      default:
        return { from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: today }
    }
  }, [datePreset, today])

  // 매출 집계
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const dateMatch = s.date >= dateRange.from && s.date <= dateRange.to
      const brandMatch = selectedBrand === 'all' ? true : s.brand === selectedBrand
      const channelMatch = channelFilter === 'all' ? true : s.channel === channelFilter
      return dateMatch && brandMatch && channelMatch
    })
  }, [sales, dateRange, selectedBrand, channelFilter])

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.revenue, 0)
  const totalCost = filteredSales.reduce((sum, s) => sum + s.costOfGoods, 0)
  const totalOrders = filteredSales.reduce((sum, s) => sum + s.orders, 0)

  // 광고비 집계
  const filteredAdSpend = useMemo(() => {
    return adSpends
      .filter((a) => {
        const dateMatch = a.date >= dateRange.from && a.date <= dateRange.to
        const brandMatch = selectedBrand === 'all' ? true : a.brand === selectedBrand
        return dateMatch && brandMatch
      })
      .reduce((sum, a) => sum + a.spend, 0)
  }, [adSpends, dateRange, selectedBrand])

  // 채널 수수료 합계
  const totalChannelFee = filteredSales.reduce((sum, s) => {
    const rate = CHANNEL_FEE_RATES[s.channel] ?? 0
    return sum + calcChannelFee(s.revenue, rate)
  }, 0)

  const shipping = totalOrders * 3000 // 평균 배송비
  const grossProfit = calcGrossProfit(totalRevenue, totalCost)
  const contributionProfit = calcContributionProfit(grossProfit, shipping, totalChannelFee, filteredAdSpend)
  const netProfit = calcNetProfit(contributionProfit, 0) // 고정비 미설정

  // 채널별 비교
  const channelSummary = useMemo(
    () => getChannelSummary(sales, dateRange.from, dateRange.to, selectedBrand),
    [sales, dateRange, selectedBrand]
  )

  // 주문 필터 + 정렬
  const filteredOrders = useMemo(() => {
    let result = orders.filter((o) => {
      const dateMatch = o.orderDate >= dateRange.from && o.orderDate <= dateRange.to
      const brandMatch = selectedBrand === 'all' ? true : o.brand === selectedBrand
      const channelMatch = channelFilter === 'all' ? true : o.channel === channelFilter
      return dateMatch && brandMatch && channelMatch
    })

    result.sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal === bVal) return 0
      const cmp = aVal < bVal ? -1 : 1
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [orders, dateRange, selectedBrand, channelFilter, sortKey, sortOrder])

  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const pagedOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
    setPage(0)
  }

  const handleCSVDownload = () => {
    const csvData = filteredOrders.map((o) => ({
      날짜: o.orderDate,
      채널: o.channelLabel,
      주문번호: o.channelOrderId,
      브랜드: o.brand === 'howpapa' ? '하우파파' : '누씨오',
      상품: o.productName,
      수량: o.quantity,
      금액: o.totalAmount,
      상태: STATUS_CONFIG[o.status].label,
    }))
    downloadCSV(csvData, `주문내역_${dateRange.from}_${dateRange.to}`)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {/* 기간 */}
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {([
                { value: 'today', label: '오늘' },
                { value: 'week', label: '이번주' },
                { value: 'month', label: '이번달' },
              ] as { value: DatePreset; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDatePreset(opt.value); setPage(0) }}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    datePreset === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 채널 */}
            <div className="flex items-center gap-1 rounded-lg border p-1">
              {CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setChannelFilter(opt.value); setPage(0) }}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    channelFilter === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이익 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="매출총이익"
          value={formatKRW(grossProfit)}
          change={totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0}
        />
        <StatsCard
          label="공헌이익"
          value={formatKRW(contributionProfit)}
          change={totalRevenue > 0 ? (contributionProfit / totalRevenue) * 100 : 0}
        />
        <StatsCard
          label="순이익"
          value={formatKRW(netProfit)}
          change={totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0}
        />
      </div>

      {/* 채널별 매출 비교 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">채널별 매출 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-sm">채널</TableHead>
                  <TableHead className="text-sm text-right">매출</TableHead>
                  <TableHead className="text-sm text-right">주문수</TableHead>
                  <TableHead className="text-sm text-right">수수료</TableHead>
                  <TableHead className="text-sm text-right">순매출</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelSummary.map((ch) => {
                  const channelKey = Object.entries(
                    { cafe24: '카페24', naver: '네이버', coupang: '쿠팡', coupang_rocket: '쿠팡로켓', qoo10: '큐텐', amazon: '아마존' }
                  ).find(([, v]) => v === ch.channel)?.[0] ?? ''
                  const feeRate = CHANNEL_FEE_RATES[channelKey] ?? 0
                  const fee = calcChannelFee(ch.revenue, feeRate)
                  return (
                    <TableRow key={ch.channel}>
                      <TableCell className="text-sm font-medium">{ch.channel}</TableCell>
                      <TableCell className="text-sm text-right">{formatKRW(ch.revenue)}</TableCell>
                      <TableCell className="text-sm text-right">{formatNumber(ch.orders)}</TableCell>
                      <TableCell className="text-sm text-right text-muted-foreground">
                        {formatKRW(fee)} ({feeRate}%)
                      </TableCell>
                      <TableCell className="text-sm text-right">{formatKRW(ch.revenue - fee)}</TableCell>
                    </TableRow>
                  )
                })}
                {channelSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      데이터가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">주문 목록</CardTitle>
            <Button variant="outline" size="sm" onClick={handleCSVDownload}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-sm">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => handleSort('orderDate')}
                    >
                      날짜
                      <ArrowUpDown className={cn('h-3 w-3', sortKey === 'orderDate' ? 'text-foreground' : 'text-muted-foreground')} />
                    </button>
                  </TableHead>
                  <TableHead className="text-sm">채널</TableHead>
                  <TableHead className="text-sm">주문번호</TableHead>
                  <TableHead className="text-sm">상품</TableHead>
                  <TableHead className="text-sm text-right">
                    <button
                      className="flex items-center gap-1 ml-auto"
                      onClick={() => handleSort('quantity')}
                    >
                      수량
                      <ArrowUpDown className={cn('h-3 w-3', sortKey === 'quantity' ? 'text-foreground' : 'text-muted-foreground')} />
                    </button>
                  </TableHead>
                  <TableHead className="text-sm text-right">
                    <button
                      className="flex items-center gap-1 ml-auto"
                      onClick={() => handleSort('totalAmount')}
                    >
                      금액
                      <ArrowUpDown className={cn('h-3 w-3', sortKey === 'totalAmount' ? 'text-foreground' : 'text-muted-foreground')} />
                    </button>
                  </TableHead>
                  <TableHead className="text-sm">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrders.map((order) => {
                  const statusCfg = STATUS_CONFIG[order.status]
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">{order.orderDate}</TableCell>
                      <TableCell className="text-sm">{order.channelLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{order.channelOrderId}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{order.productName}</TableCell>
                      <TableCell className="text-sm text-right">{order.quantity}</TableCell>
                      <TableCell className="text-sm text-right">{formatKRW(order.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {pagedOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      주문이 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length}건 중 {page * pageSize + 1}-
                {Math.min((page + 1) * pageSize, filteredOrders.length)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
