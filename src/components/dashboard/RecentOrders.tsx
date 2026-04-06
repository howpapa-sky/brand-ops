'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/format'
import type { DummyOrder } from '@/lib/dummy-data'

const STATUS_CONFIG: Record<
  DummyOrder['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  confirmed: { label: '주문확인', variant: 'default' },
  shipping: { label: '배송중', variant: 'secondary' },
  delivered: { label: '배송완료', variant: 'outline' },
  cancelled: { label: '취소', variant: 'destructive' },
}

interface RecentOrdersProps {
  orders: DummyOrder[]
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">최근 주문</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-sm">주문일</TableHead>
                <TableHead className="text-sm">채널</TableHead>
                <TableHead className="text-sm">상품</TableHead>
                <TableHead className="text-sm text-right">수량</TableHead>
                <TableHead className="text-sm text-right">금액</TableHead>
                <TableHead className="text-sm">상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const statusCfg = STATUS_CONFIG[order.status]
                return (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm">{order.orderDate}</TableCell>
                    <TableCell className="text-sm">{order.channelLabel}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {order.productName}
                    </TableCell>
                    <TableCell className="text-sm text-right">{order.quantity}</TableCell>
                    <TableCell className="text-sm text-right">
                      {formatKRW(order.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusCfg.variant} className="text-xs">
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
