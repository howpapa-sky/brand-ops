import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ logs })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
