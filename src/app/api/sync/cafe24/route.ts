import { NextRequest, NextResponse } from 'next/server'
import { fetchCafe24Orders, getCafe24BrandConfigs } from '@/lib/api/cafe24-commerce'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { withRetry } from '@/lib/api/retry'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { format, subDays } from 'date-fns'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const syncLog = await createSyncLog({ channel: 'cafe24', syncType: 'orders' })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const configs = getCafe24BrandConfigs()
    if (configs.length === 0) {
      throw new Error('카페24 API 키가 설정되지 않았습니다')
    }

    const dateTo = format(new Date(), 'yyyy-MM-dd')
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd')
    const feeRate = CHANNEL_FEE_RATES.cafe24 ?? 3.5

    let totalFetched = 0
    let totalCreated = 0
    let totalUpdated = 0
    const errors: string[] = []

    for (const config of configs) {
      try {
        const brandId = await getBrandId(config.brandCode)

        const orders = await withRetry(
          () =>
            fetchCafe24Orders(
              config.brandCode,
              config.mallId,
              config.clientId,
              config.clientSecret,
              dateFrom,
              dateTo
            ),
          3,
          2000
        )

        totalFetched += orders.length

        for (const order of orders) {
          try {
            const paymentAmount = Math.round(
              parseFloat(order.payment_amount ?? '0')
            )
            const shippingFee = order.shipping_fee_detail?.[0]
              ? Math.round(
                  parseFloat(order.shipping_fee_detail[0].shipping_fee ?? '0')
                )
              : 0
            const channelFee = Math.round(paymentAmount * (feeRate / 100))

            const items = (order.items ?? []).map((item) => ({
              productName: item.product_name,
              optionName: item.option_value ?? undefined,
              quantity: item.quantity ?? 1,
              unitPrice: Math.round(parseFloat(item.product_price ?? '0')),
              totalPrice:
                Math.round(parseFloat(item.product_price ?? '0')) *
                (item.quantity ?? 1),
            }))

            const result = await upsertOrder({
              brandId,
              channel: 'cafe24',
              channelOrderId: order.order_id,
              orderDate: new Date(order.order_date),
              status: order.items?.[0]?.status_code ?? 'N00',
              buyerName: order.billing_name,
              totalAmount: paymentAmount,
              shippingFee,
              channelFee,
              items:
                items.length > 0
                  ? items
                  : [
                      {
                        productName: '주문 상품',
                        quantity: 1,
                        unitPrice: paymentAmount,
                        totalPrice: paymentAmount,
                      },
                    ],
            })

            if (result.created) totalCreated++
            else totalUpdated++
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            errors.push(`주문 ${order.order_id}: ${msg.slice(0, 80)}`)
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        errors.push(`${config.brandCode}: ${msg.slice(0, 100)}`)
      }
    }

    await syncLog.complete({
      status:
        errors.length > 0 && totalCreated === 0 && totalUpdated === 0
          ? 'error'
          : 'success',
      recordsFetched: totalFetched,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      errorMessage:
        errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined,
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
      where: { channel: 'cafe24' },
      orderBy: { startedAt: 'desc' },
    })

    // 카페24 인증 상태 확인
    const credentials = await prisma.apiCredential.findMany({
      where: { channel: 'cafe24' },
      select: { brandCode: true, isActive: true, expiresAt: true },
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
      authStatus: credentials.map((c) => ({
        brandCode: c.brandCode,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
