import { NextRequest, NextResponse } from 'next/server'
import { fetchCoupangOrders, COUPANG_ORDER_STATUSES } from '@/lib/api/coupang'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { withRetry } from '@/lib/api/retry'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { format, subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // Cron 인증 또는 수동 요청 확인
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  // cron이 아니면 수동 요청 - 추후 NextAuth 세션 확인 추가 가능
  if (!isCron && cronSecret) {
    // 수동 동기화 허용 (세션 인증은 추후 추가)
  }

  const syncLog = await createSyncLog({
    channel: 'coupang',
    syncType: 'orders',
    triggeredBy: isCron ? 'cron' : undefined,
  })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const brandId = await getBrandId('howpapa')
    const dateTo = format(new Date(), 'yyyy-MM-dd')
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd')
    const feeRate = CHANNEL_FEE_RATES.coupang ?? 15

    let totalFetched = 0
    let totalCreated = 0
    let totalUpdated = 0
    const errors: string[] = []

    // 5개 상태 순회
    for (const status of COUPANG_ORDER_STATUSES) {
      try {
        const orders = await withRetry(
          () => fetchCoupangOrders(dateFrom, dateTo, status),
          3,
          1000
        )

        totalFetched += orders.length

        for (const order of orders) {
          try {
            const totalAmount = order.totalProductPrice ?? 0
            const channelFee = Math.round(totalAmount * (feeRate / 100))
            const shippingFee = (order.shippingPrice ?? 0) + (order.remotePrice ?? 0)

            const result = await upsertOrder({
              brandId,
              channel: 'coupang',
              channelOrderId: String(order.orderId),
              orderDate: new Date(order.orderDate),
              status: order.status ?? status,
              buyerName: order.orderer?.name,
              totalAmount,
              shippingFee,
              channelFee,
              rawData: order as unknown as Record<string, unknown>,
              items: (order.orderItems ?? []).map((item) => ({
                productName: item.sellerProductName ?? item.vendorItemName,
                optionName: item.sellerProductItemName,
                quantity: item.shippingCount ?? 1,
                unitPrice: item.orderPrice ?? 0,
                totalPrice: (item.orderPrice ?? 0) * (item.shippingCount ?? 1),
              })),
            })

            if (result.created) totalCreated++
            else totalUpdated++
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            errors.push(`주문 ${order.orderId}: ${msg.slice(0, 100)}`)
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`상태 ${status}: ${msg.slice(0, 100)}`)
      }
    }

    await syncLog.complete({
      status: errors.length > 0 && totalCreated === 0 && totalUpdated === 0 ? 'error' : 'success',
      recordsFetched: totalFetched,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
    })

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      created: totalCreated,
      updated: totalUpdated,
      errors: errors.length,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await syncLog.complete({ status: 'error', errorMessage: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const lastSync = await prisma.syncLog.findFirst({
      where: { channel: 'coupang' },
      orderBy: { startedAt: 'desc' },
    })

    return NextResponse.json({
      lastSync: lastSync
        ? {
            status: lastSync.status,
            recordsFetched: lastSync.recordsFetched,
            recordsCreated: lastSync.recordsCreated,
            recordsUpdated: lastSync.recordsUpdated,
            errorMessage: lastSync.errorMessage,
            startedAt: lastSync.startedAt,
            completedAt: lastSync.completedAt,
          }
        : null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
