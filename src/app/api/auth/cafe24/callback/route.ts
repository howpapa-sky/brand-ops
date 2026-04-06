import { NextRequest, NextResponse } from 'next/server'
import { exchangeCafe24Token, getCafe24BrandConfigs } from '@/lib/api/cafe24-commerce'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const state = req.nextUrl.searchParams.get('state')

    if (!code || !state) {
      return NextResponse.json(
        { error: 'code 또는 state 파라미터가 없습니다' },
        { status: 400 }
      )
    }

    // state에서 브랜드 추출 (형식: "brandCode:csrfToken")
    const brandCode = state.split(':')[0]
    const configs = getCafe24BrandConfigs()
    const config = configs.find((c) => c.brandCode === brandCode)

    if (!config) {
      return NextResponse.json(
        { error: `카페24 ${brandCode} 설정이 없습니다` },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/cafe24/callback`

    // authorization_code → access_token 교환
    const tokenData = await exchangeCafe24Token(
      config.mallId,
      config.clientId,
      config.clientSecret,
      code,
      redirectUri
    )

    // ApiCredential 테이블에 저장
    await prisma.apiCredential.upsert({
      where: {
        channel_brandCode: { channel: 'cafe24', brandCode },
      },
      update: {
        credentials: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          refresh_token_expires_at: tokenData.refresh_token_expires_at,
        },
        expiresAt: new Date(tokenData.expires_at),
        isActive: true,
        syncStatus: 'idle',
      },
      create: {
        channel: 'cafe24',
        brandCode,
        credentials: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          refresh_token_expires_at: tokenData.refresh_token_expires_at,
        },
        expiresAt: new Date(tokenData.expires_at),
        isActive: true,
        syncStatus: 'idle',
      },
    })

    // 성공 페이지로 리다이렉트
    return NextResponse.redirect(
      new URL(`/?cafe24_auth=success&brand=${brandCode}`, req.nextUrl.origin)
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: `카페24 인증 실패: ${message}` },
      { status: 500 }
    )
  }
}
