'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { DummyAlert } from '@/lib/dummy-data'

const SEVERITY_CONFIG: Record<
  DummyAlert['severity'],
  { icon: typeof AlertTriangle; color: string; badgeVariant: 'default' | 'secondary' | 'destructive' }
> = {
  info: { icon: Info, color: 'text-blue-500', badgeVariant: 'secondary' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', badgeVariant: 'default' },
  critical: { icon: AlertCircle, color: 'text-red-500', badgeVariant: 'destructive' },
}

interface AlertsListProps {
  alerts: DummyAlert[]
}

export function AlertsList({ alerts }: AlertsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">알림</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity]
            const Icon = cfg.icon
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <Badge variant={cfg.badgeVariant} className="text-[10px]">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {alert.createdAt.slice(5, 16)}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
