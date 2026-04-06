import { NextRequest, NextResponse } from 'next/server'
import { fetchCoupangOrders } from '@/lib/api/coupang'
import { createSyncLog, getBrandId, upsertOrder } from '@/lib/api/sync-helper'
import { CHANNEL_FEE_RATES } from '@/lib/constants'
import { format, subDays } from 'date-fns'

export async function POST(req: NextRequest) {
  const syncLog = await createSyncLog({ channel: 'coupang', syncType: 'orders' })

  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number }
    const days = body.days ?? 7

    const vendorId = process.env.COUPANG_VENDOR_ID
    const accessKey = process.env.COUPANG_ACCESS_KEY
    const secretKey = process.env.COUPANG_SECRET_KEY

    if (!vendorId || !accessKey || !secretKey) {
      throw new Error('쿠팡 API 키가 설정되지 않았습니다')
    }

    const brandId = await getBrandId('howpapa')
    const dateTo = format(new Date(), 'yyyy-MM-dd')
    const dateFrom = format(subDays(new Date(), days), 'yyyy-MM-dd')

    const coupangOrders = await fetchCoupangOrders(
      vendorId,
      accessKey,
      secretKey,
      `${dateFrom}T00:00:00`,
      `${dateTo}T23:59:59`
    )

    let created = 0
    let updated = 0
    const feeRate = CHANNEL_FEE_RATES.coupang ?? 15

    for (const order of coupangOrders) {
      try {
        const totalAmount = order.totalProductPrice ?? 0
        const channelFee = Math.round(totalAmount * (feeRate / 100))

        const result = await upsertOrder({
          brandId,
          channel: 'coupang',
          channelOrderId: String(order.orderId),
          orderDate: new Date(order.orderDate),
          status: order.status,
          buyerName: order.orderer?.name,
          totalAmount,
          shippingFee: (order.shippingPrice ?? 0) + (order.remotePrice ?? 0),
          channelFee,
          items: (order.orderItems ?? []).map((item) => ({
            productName: item.sellerProductName ?? item.vendorItemName,
            optionName: item.sellerProductItemName,
            quantity: item.shippingCount ?? 1,
            unitPrice: item.orderPrice ?? 0,
            totalPrice: (item.orderPrice ?? 0) * (item.shippingCount ?? 1),
          })),
        })

        if (result.created) created++
        else updated++
      } catch {
        // 개별 주문 에러 스킵
      }
    }

    await syncLog.complete({
      status: 'success',
      recordsFetched: coupangOrders.length,
      recordsCreated: created,
      recordsUpdated: updated,
    })

    return NextResponse.json({
      success: true,
      fetched: coupangOrders.length,
      created,
      updated,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await syncLog.complete({ status: 'error', errorMessage: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
