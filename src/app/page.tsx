import { StatsCard } from '@/components/common/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Building2, Radio, Users } from 'lucide-react'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  let dbConnected = false
  let brandCount = 0
  let channelCount = 0
  let userCount = 0
  let brands: { name: string; displayName: string; color: string }[] = []
  let channels: { channelName: string; feeRate: number }[] = []

  try {
    brands = await prisma.brand.findMany({
      select: { name: true, displayName: true, color: true },
    })
    channels = await prisma.channelSetting.findMany({
      select: { channelName: true, feeRate: true },
    })
    userCount = await prisma.user.count()
    brandCount = brands.length
    channelCount = channels.length
    dbConnected = true
  } catch {
    dbConnected = false
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="DB 연결"
          value={dbConnected ? '연결됨' : '연결 실패'}
          icon={Database}
        />
        <StatsCard
          label="브랜드"
          value={`${brandCount}개`}
          icon={Building2}
        />
        <StatsCard
          label="채널"
          value={`${channelCount}개`}
          icon={Radio}
        />
        <StatsCard
          label="사용자"
          value={`${userCount}명`}
          icon={Users}
        />
      </div>

      {dbConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>브랜드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {brands.map((brand) => (
                  <div key={brand.displayName} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: brand.color }}
                    />
                    <span className="font-medium">{brand.displayName}</span>
                    <span className="text-sm text-muted-foreground">
                      {brand.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>채널 설정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {channels.map((ch) => (
                  <div
                    key={ch.channelName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{ch.channelName}</span>
                    <span className="text-muted-foreground">
                      수수료 {ch.feeRate}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>초기 세팅</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              DB 연결 후 시드 데이터를 실행하면 대시보드가 활성화됩니다.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>초기 세팅 완료!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            다음 단계: 매출 대시보드 구축 (Phase 1)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
