/**
 * 동기화 공통 헬퍼
 * SyncLog 기록 + 에러 처리
 */
import { prisma } from '@/lib/prisma'

interface SyncLogParams {
  channel: string
  syncType: string
  triggeredBy?: string
}

interface SyncLogResult {
  logId: string
  complete: (params: {
    status: 'success' | 'error'
    recordsFetched?: number
    recordsCreated?: number
    recordsUpdated?: number
    errorMessage?: string
  }) => Promise<void>
}

export async function createSyncLog({
  channel,
  syncType,
  triggeredBy,
}: SyncLogParams): Promise<SyncLogResult> {
  const log = await prisma.syncLog.create({
    data: {
      channel,
      syncType,
      status: 'running',
      triggeredBy,
    },
  })

  return {
    logId: log.id,
    complete: async ({ status, recordsFetched, recordsCreated, recordsUpdated, errorMessage }) => {
      await prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status,
          recordsFetched: recordsFetched ?? 0,
          recordsCreated: recordsCreated ?? 0,
          recordsUpdated: recordsUpdated ?? 0,
          errorMessage,
          completedAt: new Date(),
        },
      })
    },
  }
}

export async function getBrandId(brandCode: string): Promise<string> {
  const brand = await prisma.brand.findUnique({ where: { code: brandCode } })
  if (!brand) throw new Error(`브랜드 "${brandCode}" 없음`)
  return brand.id
}

export async function upsertOrder(params: {
  brandId: string
  channel: string
  channelOrderId: string
  orderDate: Date
  status: string
  buyerName?: string
  buyerPhone?: string
  totalAmount: number
  shippingFee: number
  channelFee: number
  rawData?: Record<string, unknown>
  items: {
    productName: string
    optionName?: string
    quantity: number
    unitPrice: number
    totalPrice: number
    costPrice?: number
  }[]
}): Promise<{ created: boolean }> {
  const netAmount = params.totalAmount - params.channelFee

  const existing = await prisma.order.findUnique({
    where: {
      channel_channelOrderId: {
        channel: params.channel,
        channelOrderId: params.channelOrderId,
      },
    },
  })

  const order = await prisma.order.upsert({
    where: {
      channel_channelOrderId: {
        channel: params.channel,
        channelOrderId: params.channelOrderId,
      },
    },
    update: {
      status: params.status,
      totalAmount: params.totalAmount,
      shippingFee: params.shippingFee,
      channelFee: params.channelFee,
      netAmount,
    },
    create: {
      brandId: params.brandId,
      channel: params.channel,
      channelOrderId: params.channelOrderId,
      orderDate: params.orderDate,
      status: params.status,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      totalAmount: params.totalAmount,
      shippingFee: params.shippingFee,
      channelFee: params.channelFee,
      netAmount,
      rawData: params.rawData as Parameters<typeof prisma.order.create>[0]['data']['rawData'],
    },
  })

  // 신규 주문일 때만 아이템 생성
  if (!existing) {
    for (const item of params.items) {
      const profit = item.totalPrice - (item.costPrice ?? 0)
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productName: item.productName,
          optionName: item.optionName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          costPrice: item.costPrice ?? 0,
          profit,
        },
      })
    }
  }

  return { created: !existing }
}
