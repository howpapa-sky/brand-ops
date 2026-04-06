/**
 * 네이버 커머스 API 클라이언트
 * NCP 프록시 경유 (IP 화이트리스트 제한)
 *
 * 주문 수집 2단계:
 * 1. 변경 상품 주문 내역 조회 (24시간 단위 분할)
 * 2. 상품 주문 상세 내역 조회 (100개씩 배치)
 */

const NCP_PROXY_URL = process.env.NCP_PROXY_URL ?? 'http://49.50.131.90:3100'

function getNcpApiKey(): string {
  const key = process.env.NCP_PROXY_API_KEY
  if (!key) throw new Error('NCP_PROXY_API_KEY가 설정되지 않았습니다')
  return key
}

// Step 1: NCP 프록시를 통해 네이버 토큰 발급
async function getNaverToken(
  clientId: string,
  clientSecret: string
): Promise<{ token: string }> {
  const res = await fetch(`${NCP_PROXY_URL}/naver/token`, {
    method: 'POST',
    headers: {
      'x-api-key': getNcpApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clientId, clientSecret }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`네이버 토큰 발급 실패 ${res.status}: ${text}`)
  }
  return res.json() as Promise<{ token: string }>
}

// Step 2: NCP 프록시를 통해 네이버 API 호출
async function naverApiRequest<T>(
  endpoint: string,
  token: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<T> {
  const res = await fetch(`${NCP_PROXY_URL}/naver/api${endpoint}`, {
    method,
    headers: {
      'x-api-key': getNcpApiKey(),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`네이버 API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// 응답 타입
interface NaverChangedStatus {
  productOrderId: string
  lastChangedDate: string
  lastChangedType: string
  orderId: string
}

interface NaverChangedResponse {
  data: {
    lastChangeStatuses: NaverChangedStatus[]
    moreSequence: string | null
  }
}

export interface NaverProductOrder {
  productOrderId: string
  orderId: string
  orderDate: string
  productName: string
  optionManageCode: string | null
  quantity: number
  unitPrice: number
  totalPaymentAmount: number
  productOrderStatus: string
  placeOrderDate: string
  paymentDate: string
  ordererName: string
  ordererTel: string | null
  productId: string | null
  channelProductNo: string | null
  totalProductAmount: number
  deliveryFeeAmount: number
  commission: number
}

interface NaverDetailResponse {
  data: NaverProductOrder[]
}

/**
 * 네이버 주문 수집 (24시간 단위 분할)
 */
export async function fetchNaverOrders(
  clientId: string,
  clientSecret: string,
  daysBack: number = 7
): Promise<NaverProductOrder[]> {
  const { token } = await getNaverToken(clientId, clientSecret)
  const allOrders: NaverProductOrder[] = []

  // 24시간 단위로 분할 조회
  for (let i = 0; i < daysBack; i++) {
    const to = new Date()
    to.setDate(to.getDate() - i)
    to.setHours(23, 59, 59, 999)

    const from = new Date(to)
    from.setDate(from.getDate() - 1)
    from.setHours(0, 0, 0, 0)

    try {
      // Step 1: 변경된 주문 ID 목록
      const changedRes = await naverApiRequest<NaverChangedResponse>(
        `/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${from.toISOString()}&lastChangedTo=${to.toISOString()}`,
        token
      )

      const productOrderIds =
        changedRes?.data?.lastChangeStatuses?.map((s) => s.productOrderId) ?? []

      if (productOrderIds.length === 0) continue

      // Step 2: 상세 조회 (100개씩 분할)
      for (let j = 0; j < productOrderIds.length; j += 100) {
        const batch = productOrderIds.slice(j, j + 100)

        try {
          const detailRes = await naverApiRequest<NaverDetailResponse>(
            '/v1/pay-order/seller/product-orders/query',
            token,
            'POST',
            { productOrderIds: batch }
          )
          allOrders.push(...(detailRes?.data ?? []))
        } catch {
          // 배치 실패 시 스킵, 다음 배치 진행
        }
      }
    } catch {
      // 날짜 단위 실패 시 스킵, 다음 날짜 진행
    }
  }

  return allOrders
}

// 브랜드별 설정
export interface NaverBrandConfig {
  brandCode: string
  clientId: string
  clientSecret: string
}

export function getNaverBrandConfigs(): NaverBrandConfig[] {
  const configs: NaverBrandConfig[] = []

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
