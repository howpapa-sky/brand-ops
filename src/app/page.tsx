import { StatsCard } from '@/components/common/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Building2, Radio, Users } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="DB 연결"
          value="대기중"
          icon={Database}
        />
        <StatsCard
          label="브랜드"
          value="0개"
          icon={Building2}
        />
        <StatsCard
          label="채널"
          value="0개"
          icon={Radio}
        />
        <StatsCard
          label="사용자"
          value="0명"
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>초기 세팅</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            DB 연결 후 시드 데이터를 실행하면 대시보드가 활성화됩니다.
          </p>
          <pre className="mt-4 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
            {`# 1. .env에 DATABASE_URL 설정
# 2. npx prisma migrate dev --name init
# 3. npx prisma db seed`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
