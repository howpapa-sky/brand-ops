/**
 * 카페24 API (OAuth 2.0)
 * 인증: client_credentials → access_token
 * 주문 조회: 30일 분할 조회
 */

interface Cafe24TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}

async function getCafe24AccessToken(
  mallId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(
    `https://${mallId}.cafe24api.com/api/v2/oauth/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'mall.read_order,mall.read_product',
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`카페24 토큰 발급 실패 ${res.status}: ${text}`)
  }

  const data = (await res.json()) as Cafe24TokenResponse
  return data.access_token
}

interface Cafe24OrderItem {
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

interface Cafe24Order {
  order_id: string
  order_date: string
  payment_date: string
  order_place_name: string
  payment_amount: string
  billing_name: string
  items: Cafe24OrderItem[]
  actual_order_amount: {
    payment_amount: string
    shipping_fee: string
  }
  shipping_fee_detail: {
    shipping_fee: string
  }[]
}

interface Cafe24OrdersResponse {
  orders: Cafe24Order[]
}

export async function fetchCafe24Orders(
  mallId: string,
  clientId: string,
  clientSecret: string,
  startDate: string,
  endDate: string
): Promise<Cafe24Order[]> {
  const accessToken = await getCafe24AccessToken(mallId, clientId, clientSecret)
  const allOrders: Cafe24Order[] = []

  // 카페24는 한 번에 최대 30일까지 조회
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
          'X-Cafe24-Api-Version': '2024-03-01',
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

export type { Cafe24Order, Cafe24OrderItem }
