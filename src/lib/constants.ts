export const BRAND_COLORS = {
  howpapa: '#f97316',
  nucio: '#22c55e',
} as const

export const CHANNEL_NAMES: Record<string, string> = {
  cafe24: '카페24 (자사몰)',
  naver: '네이버 스마트스토어',
  coupang: '쿠팡 마켓플레이스',
  coupang_rocket: '쿠팡 로켓배송',
  qoo10: '큐텐',
  amazon: '아마존',
  shopee: '쇼피',
}

export const CHANNEL_FEE_RATES: Record<string, number> = {
  cafe24: 3.5,
  naver: 5.5,
  coupang: 15,
  coupang_rocket: 35,
  qoo10: 10,
  amazon: 15,
}

export const AD_PLATFORMS = {
  meta: '메타 광고',
  naver_sa: '네이버 검색광고',
  naver_gfa: '네이버 GFA',
  coupang_ads: '쿠팡 광고',
} as const

// NCP 프록시 서버 (네이버 API IP 화이트리스트용)
export const NCP_PROXY = {
  url: 'http://49.50.131.90:3100',
  // API key는 환경변수에서: process.env.NCP_PROXY_API_KEY
} as const
