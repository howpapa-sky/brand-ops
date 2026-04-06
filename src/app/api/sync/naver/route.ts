import { NextRequest, NextResponse } from 'next/server'
import { fetchNaverOrders, getNaverBrandConfigs } from '@/lib/api/naver-commerce'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { withRetry } from '@/lib/api/retry'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const syncLog = await createSyncLog({ channel: 'naver', syncType: 'orders' })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const configs = getNaverBrandConfigs()
    if (configs.length === 0) {
      throw new Error('네이버 커머스 API 키가 설정되지 않았습니다')
    }

    const feeRate = CHANNEL_FEE_RATES.naver ?? 5.5
    let totalFetched = 0
    let totalCreated = 0
    let totalUpdated = 0
    const errors: string[] = []

    for (const config of configs) {
      try {
        const brandId = await getBrandId(config.brandCode)

        const orders = await withRetry(
          () => fetchNaverOrders(config.clientId, config.clientSecret, days),
          3,
          2000
        )

        totalFetched += orders.length

        for (const order of orders) {
          try {
            const totalAmount = order.totalPaymentAmount ?? order.totalProductAmount ?? 0
            const channelFee = order.commission ?? Math.round(totalAmount * (feeRate / 100))
            const shippingFee = order.deliveryFeeAmount ?? 0

            const result = await upsertOrder({
              brandId,
              channel: 'naver',
              channelOrderId: order.productOrderId,
              orderDate: new Date(order.orderDate ?? order.placeOrderDate),
              status: order.productOrderStatus,
              buyerName: order.ordererName,
              totalAmount,
              shippingFee,
              channelFee,
              items: [
                {
                  productName: order.productName,
                  optionName: order.optionManageCode ?? undefined,
                  quantity: order.quantity ?? 1,
                  unitPrice: order.unitPrice ?? 0,
                  totalPrice: totalAmount,
                },
              ],
            })

            if (result.created) totalCreated++
            else totalUpdated++
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            errors.push(`주문 ${order.productOrderId}: ${msg.slice(0, 80)}`)
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${config.brandCode}: ${msg.slice(0, 100)}`)
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
      where: { channel: 'naver' },
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
