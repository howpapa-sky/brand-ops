/**
 * 카페24 커머스 API 클라이언트
 * OAuth 2.0 (authorization_code → access_token → refresh_token)
 * 토큰은 ApiCredential 테이블에 저장
 */
import { prisma } from '@/lib/prisma'

// ─── OAuth 토큰 관리 ───

/** 카페24 OAuth 인증 URL 생성 */
export function getCafe24AuthUrl(
  mallId: string,
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const scope = 'mall.read_order,mall.read_product,mall.read_salesreport'
  return `https://${mallId}.cafe24api.com/api/v2/oauth/authorize?response_type=code&client_id=${clientId}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`
}

interface Cafe24TokenResponse {
  access_token: string
  expires_at: string
  refresh_token: string
  refresh_token_expires_at: string
  client_id: string
  mall_id: string
  user_id: string
  scopes: string[]
  issued_at: string
}

/** authorization_code → access_token 교환 */
export async function exchangeCafe24Token(
  mallId: string,
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<Cafe24TokenResponse> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`카페24 토큰 교환 실패 ${res.status}: ${text}`)
  }
  return res.json() as Promise<Cafe24TokenResponse>
}

/** refresh_token → 새 access_token 갱신 */
export async function refreshCafe24Token(
  mallId: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<Cafe24TokenResponse> {
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`카페24 토큰 갱신 실패 ${res.status}: ${text}`)
  }
  return res.json() as Promise<Cafe24TokenResponse>
}

/** DB에서 토큰 조회 + 만료 시 자동 갱신 */
export async function getCafe24AccessToken(
  brandCode: string,
  mallId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const credential = await prisma.apiCredential.findUnique({
    where: { channel_brandCode: { channel: 'cafe24', brandCode } },
  })

  if (!credential) {
    throw new Error(
      `카페24 ${brandCode} 인증이 필요합니다. /api/auth/cafe24?brand=${brandCode} 로 OAuth 인증을 진행하세요.`
    )
  }

  const creds = credential.credentials as {
    access_token: string
    refresh_token: string
    expires_at: string
  }

  // 만료 확인 (5분 여유)
  const expiresAt = new Date(creds.expires_at)
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)

  if (now < expiresAt) {
    return creds.access_token
  }

  // 토큰 갱신
  const newToken = await refreshCafe24Token(mallId, clientId, clientSecret, creds.refresh_token)

  await prisma.apiCredential.update({
    where: { channel_brandCode: { channel: 'cafe24', brandCode } },
    data: {
      credentials: {
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token,
        expires_at: newToken.expires_at,
        refresh_token_expires_at: newToken.refresh_token_expires_at,
      },
      expiresAt: new Date(newToken.expires_at),
      lastSyncAt: new Date(),
    },
  })

  return newToken.access_token
}

// ─── 주문 조회 ───

export interface Cafe24OrderItem {
  item_no: number
  product_no: number
  product_code: string
  product_name: string
  option_value: string
  quantity: number
  product_price: string
  option_price: string
  order_item_code: string
  status_code: string
  status_text: string
  shipping_company_name: string
  tracking_no: string
}

export interface Cafe24Order {
  order_id: string
  order_date: string
  payment_date: string
  order_place_name: string
  payment_amount: string
  billing_name: string
  items: Cafe24OrderItem[]
  shipping_fee_detail: { shipping_fee: string }[]
}

interface Cafe24OrdersResponse {
  orders: Cafe24Order[]
}

/** 카페24 주문 조회 */
export async function fetchCafe24Orders(
  brandCode: string,
  mallId: string,
  clientId: string,
  clientSecret: string,
  startDate: string,
  endDate: string
): Promise<Cafe24Order[]> {
  const accessToken = await getCafe24AccessToken(brandCode, mallId, clientId, clientSecret)
  const allOrders: Cafe24Order[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      limit: limit.toString(),
      offset: offset.toString(),
      embed: 'items',
    })

    const res = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/orders?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`카페24 주문 조회 실패 ${res.status}: ${text}`)
    }

    const json = (await res.json()) as Cafe24OrdersResponse
    if (!json.orders || json.orders.length === 0) break

    allOrders.push(...json.orders)
    if (json.orders.length < limit) break
    offset += limit
  }

  return allOrders
}

// 브랜드별 설정
export interface Cafe24BrandConfig {
  brandCode: string
  mallId: string
  clientId: string
  clientSecret: string
}

export function getCafe24BrandConfigs(): Cafe24BrandConfig[] {
  const configs: Cafe24BrandConfig[] = []

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
