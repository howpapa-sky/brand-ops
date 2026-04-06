/**
 * 쿠팡 Wing API 클라이언트
 * HMAC-SHA256 서명 (공식 문서 기준, 변경 금지)
 */
import crypto from 'crypto'

// datetime: yymmddTHHmmssZ 포맷 (ISO 아님!)
function getCoupangDatetime(): string {
  const now = new Date()
  const yy = String(now.getUTCFullYear()).slice(2)
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const HH = String(now.getUTCHours()).padStart(2, '0')
  const MM = String(now.getUTCMinutes()).padStart(2, '0')
  const SS = String(now.getUTCSeconds()).padStart(2, '0')
  return `${yy}${mm}${dd}T${HH}${MM}${SS}Z`
}

// HMAC 서명: message = datetime + method + path + query
function generateSignature(
  method: string,
  path: string,
  query: string
): { authorization: string } {
  const secretKey = process.env.COUPANG_SECRET_KEY
  const accessKey = process.env.COUPANG_ACCESS_KEY
  if (!secretKey || !accessKey) {
    throw new Error('쿠팡 API 키가 설정되지 않았습니다 (COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY)')
  }

  const datetime = getCoupangDatetime()
  const message = datetime + method + path + query
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex')

  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`
  return { authorization }
}

// API 호출 (필수 헤더: Authorization + X-Requested-By)
export async function coupangRequest<T>(
  method: string,
  path: string,
  query: string = ''
): Promise<T> {
  const vendorId = process.env.COUPANG_VENDOR_ID
  if (!vendorId) {
    throw new Error('COUPANG_VENDOR_ID가 설정되지 않았습니다')
  }

  const { authorization } = generateSignature(method, path, query)
  const url = `https://api-gateway.coupang.com${path}${query ? '?' + query : ''}`

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      Authorization: authorization,
      'X-Requested-By': vendorId,
    },
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`쿠팡 API 에러 ${res.status}: ${errorText}`)
  }
  return res.json() as Promise<T>
}

// 주문 조회 응답 타입
export interface CoupangOrderItem {
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

export interface CoupangOrder {
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
  overseaShippingInfoDto: unknown
}

interface CoupangOrdersResponse {
  code: string
  message: string
  data: CoupangOrder[]
  nextToken?: string
}

// 주문 상태 목록
export const COUPANG_ORDER_STATUSES = [
  'ACCEPT',
  'INSTRUCT',
  'DEPARTURE',
  'DELIVERING',
  'FINAL_DELIVERY',
] as const

export type CoupangOrderStatus = (typeof COUPANG_ORDER_STATUSES)[number]

/**
 * 쿠팡 주문 조회 (페이지네이션 + 상태별)
 */
export async function fetchCoupangOrders(
  dateFrom: string,
  dateTo: string,
  status: CoupangOrderStatus
): Promise<CoupangOrder[]> {
  const vendorId = process.env.COUPANG_VENDOR_ID
  if (!vendorId) throw new Error('COUPANG_VENDOR_ID 미설정')

  const allOrders: CoupangOrder[] = []
  let nextToken: string | undefined

  do {
    const params = new URLSearchParams({
      createdAtFrom: dateFrom,
      createdAtTo: dateTo,
      status,
      maxPerPage: '50',
    })
    if (nextToken) {
      params.set('nextToken', nextToken)
    }

    const path = `/v2/providers/openapi/apis/api/v4/vendors/${vendorId}/ordersheets`
    const query = params.toString()

    const json = await coupangRequest<CoupangOrdersResponse>('GET', path, query)

    if (json.data && json.data.length > 0) {
      allOrders.push(...json.data)
    }
    nextToken = json.nextToken
  } while (nextToken)

  return allOrders
}
