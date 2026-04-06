'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/format'
import type { BrandFilter } from '@/types'

interface ChannelData {
  channel: string
  howpapa: number
  nucio: number
  revenue: number
}

interface ChannelBarChartProps {
  data: ChannelData[]
  brandFilter: BrandFilter
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium text-sm mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatKRW(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function ChannelBarChart({ data, brandFilter }: ChannelBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">채널별 매출</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${Math.round(v / 10000)}만`}
              />
              <Tooltip content={<CustomTooltip />} />
              {brandFilter === 'all' ? (
                <>
                  <Legend />
                  <Bar dataKey="howpapa" name="하우파파" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nucio" name="누씨오" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </>
              ) : (
                <Bar
                  dataKey="revenue"
                  name={brandFilter === 'howpapa' ? '하우파파' : '누씨오'}
                  fill={brandFilter === 'howpapa' ? '#f97316' : '#22c55e'}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
