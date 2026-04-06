import { NextRequest, NextResponse } from 'next/server'
import { getCafe24AuthUrl, getCafe24BrandConfigs } from '@/lib/api/cafe24-commerce'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get('brand') ?? 'howpapa'
    const configs = getCafe24BrandConfigs()
    const config = configs.find((c) => c.brandCode === brand)

    if (!config) {
      return NextResponse.json(
        { error: `카페24 ${brand} 설정이 없습니다` },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/cafe24/callback`

    // state에 브랜드 + CSRF 토큰
    const csrfToken = crypto.randomBytes(16).toString('hex')
    const state = `${brand}:${csrfToken}`

    const authUrl = getCafe24AuthUrl(
      config.mallId,
      config.clientId,
      redirectUri,
      state
    )

    return NextResponse.redirect(authUrl)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
