/**
 * 쿠팡 Wing API HMAC 서명 생성
 * 참고: https://developers.coupangcorp.com/hc/ko
 */
import { createHmac } from 'crypto'

interface CoupangAuthParams {
  method: string
  path: string
  accessKey: string
  secretKey: string
}

export function generateCoupangSignature({
  method,
  path,
  accessKey,
  secretKey,
}: CoupangAuthParams): { authorization: string } {
  const datetime = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  const message = `${datetime}${method}${path}`
  const signature = createHmac('sha256', secretKey)
    .update(message)
    .digest('hex')

  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`

  return { authorization }
}

interface CoupangOrderItem {
  vendorItemId: number
  vendorItemName: string
  shippingCount: number
  orderPrice: number
  discountPrice: number
  instantDiscountPrice: number
  sellerProductId: number
  sellerProductName: string
  sellerProductItemName: string
  cancelCount: number
  estimatedShippingDate: string
  placedDate: string
  statusName: string
}

interface CoupangOrderResponse {
  orderId: number
  orderDate: string
  status: string
  paidAt: string
  orderer: {
    name: string
    email: string
  }
  receiver: {
    name: string
    receiverName: string
    addr1: string
    postCode: string
    safeNumber: string
  }
  orderItems: CoupangOrderItem[]
  shippingPrice: number
  remotePrice: number
  totalProductPrice: number
}

interface CoupangApiResponse {
  code: string
  message: string
  data: CoupangOrderResponse[]
  nextToken?: string
}

export async function fetchCoupangOrders(
  vendorId: string,
  accessKey: string,
  secretKey: string,
  createdAtFrom: string,
  createdAtTo: string,
  status: string = 'ACCEPT'
): Promise<CoupangOrderResponse[]> {
  const allOrders: CoupangOrderResponse[] = []
  let nextToken: string | undefined

  do {
    const searchParams = new URLSearchParams({
      createdAtFrom,
      createdAtTo,
      status,
      maxPerPage: '50',
    })
    if (nextToken) {
      searchParams.set('nextToken', nextToken)
    }

    const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets?${searchParams.toString()}`
    const { authorization } = generateCoupangSignature({
      method: 'GET',
      path,
      accessKey,
      secretKey,
    })

    const res = await fetch(`https://api-gateway.coupang.com${path}`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json;charset=UTF-8',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`쿠팡 API 에러 ${res.status}: ${text}`)
    }

    const json = (await res.json()) as CoupangApiResponse
    if (json.code !== '200' && json.code !== 'SUCCESS') {
      throw new Error(`쿠팡 API 응답 에러: ${json.message}`)
    }

    if (json.data) {
      allOrders.push(...json.data)
    }
    nextToken = json.nextToken
  } while (nextToken)

  return allOrders
}

export type { CoupangOrderResponse, CoupangOrderItem }
