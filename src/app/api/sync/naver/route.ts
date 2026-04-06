import { NextRequest, NextResponse } from 'next/server'
import { fetchNaverOrders } from '@/lib/api/naver'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { format, subDays } from 'date-fns'

interface BrandConfig {
  brandCode: string
  clientId: string
  clientSecret: string
}

function getBrandConfigs(): BrandConfig[] {
  const configs: BrandConfig[] = []

  if (process.env.NAVER_COMMERCE_CLIENT_ID && process.env.NAVER_COMMERCE_CLIENT_SECRET) {
    configs.push({
      brandCode: 'howpapa',
      clientId: process.env.NAVER_COMMERCE_CLIENT_ID,
      clientSecret: process.env.NAVER_COMMERCE_CLIENT_SECRET,
    })
  }

  if (process.env.NAVER_COMMERCE_NUCIO_CLIENT_ID && process.env.NAVER_COMMERCE_NUCIO_CLIENT_SECRET) {
    configs.push({
      brandCode: 'nucio',
      clientId: process.env.NAVER_COMMERCE_NUCIO_CLIENT_ID,
      clientSecret: process.env.NAVER_COMMERCE_NUCIO_CLIENT_SECRET,
    })
  }

  return configs
}

export async function POST(req: NextRequest) {
  const syncLog = await createSyncLog({ channel: 'naver', syncType: 'orders' })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const configs = getBrandConfigs()
    if (configs.length === 0) {
      throw new Error('네이버 커머스 API 키가 설정되지 않았습니다')
    }

    const dateTo = format(new Date(), 'yyyy-MM-dd')
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd')
    const feeRate = CHANNEL_FEE_RATES.naver ?? 5.5

    let totalFetched = 0
    let totalCreated = 0
    let totalUpdated = 0

    for (const config of configs) {
      try {
        const brandId = await getBrandId(config.brandCode)
        const orders = await fetchNaverOrders(
          config.clientId,
          config.clientSecret,
          dateFrom,
          dateTo
        )

        totalFetched += orders.length

        for (const order of orders) {
          try {
            const totalAmount = order.totalPaymentAmount ?? 0
            const channelFee = Math.round(totalAmount * (feeRate / 100))

            const result = await upsertOrder({
              brandId,
              channel: 'naver',
              channelOrderId: order.productOrderId,
              orderDate: new Date(order.orderDate ?? order.placeOrderDate),
              status: order.productOrderStatus,
              buyerName: order.ordererName,
              totalAmount,
              shippingFee: 0,
              channelFee,
              items: [
                {
                  productName: order.productName,
                  optionName: order.optionManageCode,
                  quantity: order.quantity ?? 1,
                  unitPrice: order.unitPrice ?? 0,
                  totalPrice: totalAmount,
                },
              ],
            })

            if (result.created) totalCreated++
            else totalUpdated++
          } catch {
            // 개별 주문 에러 스킵
          }
        }
      } catch {
        // 브랜드별 에러 스킵, 다음 브랜드 진행
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
