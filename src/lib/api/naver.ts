/**
 * 네이버 커머스 API
 * NCP 프록시 경유 (IP 화이트리스트 제한)
 * 인증: bcrypt + Base64 (client_id:timestamp:client_secret_sign)
 */
import bcrypt from 'bcryptjs'
import { NCP_PROXY } from '@/lib/constants'

interface NaverTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

async function getNaverAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const timestamp = Date.now()
  // 네이버 커머스 인증: clientId + _ + timestamp를 bcrypt로 서명
  const password = `${clientId}_${timestamp}`
  const clientSecretSign = bcrypt.hashSync(password, clientSecret)
  const encodedSign = Buffer.from(clientSecretSign).toString('base64')

  const tokenUrl = `${NCP_PROXY.url}/api/naver/token`
  const proxyApiKey = process.env.NCP_PROXY_API_KEY ?? ''

  const body = {
    client_id: clientId,
    timestamp: timestamp.toString(),
    client_secret_sign: encodedSign,
    grant_type: 'client_credentials',
    type: 'SELF',
  }

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': proxyApiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`네이버 토큰 발급 실패 ${res.status}: ${text}`)
  }

  const data = (await res.json()) as NaverTokenResponse
  return data.access_token
}

interface NaverProductOrder {
  productOrderId: string
  orderId: string
  orderDate: string
  productName: string
  optionManageCode: string
  quantity: number
  unitPrice: number
  totalPaymentAmount: number
  productOrderStatus: string
  placeOrderDate: string
  paymentDate: string
  shippingFeeType: string
  ordererName: string
  ordererTel: string
}

interface NaverOrdersResponse {
  data: {
    lastChangeStatuses: {
      productOrderId: string
      lastChangedDate: string
      lastChangedType: string
      receiverName: string
      orderId: string
      productOrder: NaverProductOrder
    }[]
    moreSequence: string | null
  }
}

export async function fetchNaverOrders(
  clientId: string,
  clientSecret: string,
  fromDate: string,
  toDate: string
): Promise<NaverProductOrder[]> {
  const accessToken = await getNaverAccessToken(clientId, clientSecret)
  const proxyApiKey = process.env.NCP_PROXY_API_KEY ?? ''

  const allOrders: NaverProductOrder[] = []
  let moreSequence: string | null = null

  do {
    const body: Record<string, unknown> = {
      lastChangedFrom: `${fromDate}T00:00:00.000+09:00`,
      lastChangedTo: `${toDate}T23:59:59.999+09:00`,
      lastChangedType: 'PAYED',
    }
    if (moreSequence) {
      body.moreSequence = moreSequence
    }

    const url = `${NCP_PROXY.url}/api/naver/commerce/v1/changes`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'x-api-key': proxyApiKey,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`네이버 주문 조회 실패 ${res.status}: ${text}`)
    }

    const json = (await res.json()) as NaverOrdersResponse
    if (json.data?.lastChangeStatuses) {
      allOrders.push(
        ...json.data.lastChangeStatuses.map((s) => s.productOrder)
      )
    }
    moreSequence = json.data?.moreSequence ?? null
  } while (moreSequence)

  return allOrders
}

export type { NaverProductOrder }
