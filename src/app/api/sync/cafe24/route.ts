import { NextRequest, NextResponse } from 'next/server'
import { fetchCafe24Orders } from '@/lib/api/cafe24'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { format, subDays } from 'date-fns'

interface BrandConfig {
  brandCode: string
  mallId: string
  clientId: string
  clientSecret: string
}

function getBrandConfigs(): BrandConfig[] {
  const configs: BrandConfig[] = []

  if (process.env.CAFE24_MALL_ID && process.env.CAFE24_CLIENT_ID && process.env.CAFE24_CLIENT_SECRET) {
    configs.push({
      brandCode: 'howpapa',
      mallId: process.env.CAFE24_MALL_ID,
      clientId: process.env.CAFE24_CLIENT_ID,
      clientSecret: process.env.CAFE24_CLIENT_SECRET,
    })
  }

  if (process.env.CAFE24_NUCIO_MALL_ID && process.env.CAFE24_NUCIO_CLIENT_ID && process.env.CAFE24_NUCIO_CLIENT_SECRET) {
    configs.push({
      brandCode: 'nucio',
      mallId: process.env.CAFE24_NUCIO_MALL_ID,
      clientId: process.env.CAFE24_NUCIO_CLIENT_ID,
      clientSecret: process.env.CAFE24_NUCIO_CLIENT_SECRET,
    })
  }

  return configs
}

export async function POST(req: NextRequest) {
  const syncLog = await createSyncLog({ channel: 'cafe24', syncType: 'orders' })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const configs = getBrandConfigs()
    if (configs.length === 0) {
      throw new Error('카페24 API 키가 설정되지 않았습니다')
    }

    const dateTo = format(new Date(), 'yyyy-MM-dd')
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd')
    const feeRate = CHANNEL_FEE_RATES.cafe24 ?? 3.5

    let totalFetched = 0
    let totalCreated = 0
    let totalUpdated = 0

    for (const config of configs) {
      try {
        const brandId = await getBrandId(config.brandCode)
        const orders = await fetchCafe24Orders(
          config.mallId,
          config.clientId,
          config.clientSecret,
          dateFrom,
          dateTo
        )

        totalFetched += orders.length

        for (const order of orders) {
          try {
            const paymentAmount = Math.round(parseFloat(order.payment_amount ?? '0'))
            const shippingFee = order.shipping_fee_detail?.[0]
              ? Math.round(parseFloat(order.shipping_fee_detail[0].shipping_fee ?? '0'))
              : 0
            const channelFee = Math.round(paymentAmount * (feeRate / 100))

            const items = (order.items ?? []).map((item) => ({
              productName: item.product_name,
              optionName: item.option_value ?? undefined,
              quantity: item.quantity ?? 1,
              unitPrice: Math.round(parseFloat(item.product_price ?? '0')),
              totalPrice: Math.round(parseFloat(item.product_price ?? '0')) * (item.quantity ?? 1),
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
              items: items.length > 0 ? items : [{
                productName: '주문 상품',
                quantity: 1,
                unitPrice: paymentAmount,
                totalPrice: paymentAmount,
              }],
            })

            if (result.created) totalCreated++
            else totalUpdated++
          } catch {
            // 개별 주문 에러 스킵
          }
        }
      } catch {
        // 브랜드별 에러 스킵
      }
    }

    await syncLog.complete({
      status: 'success',
      recordsFetched: totalFetched,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
    })

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      created: totalCreated,
      updated: totalUpdated,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await syncLog.complete({ status: 'error', errorMessage: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
