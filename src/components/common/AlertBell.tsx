'use client'

import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAlerts } from '@/hooks/useAlerts'
import { Badge } from '@/components/ui/badge'

export function AlertBell() {
  const { alerts, unreadCount } = useAlerts()
  const recentAlerts = alerts.slice(0, 5)

  return (
    <Popover>
      <PopoverTrigger className="relative p-2 rounded-md hover:bg-muted transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">알림</h4>
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              알림이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2 rounded-md p-2 hover:bg-muted"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {alert.title}
                      </p>
                      <Badge
                        variant={
                          alert.severity === 'error'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] shrink-0"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
