import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  label: string
  value: string
  change?: number
  icon?: LucideIcon
}

export function StatsCard({ label, value, change, icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <p
                className={cn(
                  'text-xs font-medium',
                  change > 0
                    ? 'text-green-600'
                    : change < 0
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                )}
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-muted p-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
