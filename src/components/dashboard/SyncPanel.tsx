'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Check, X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface SyncLog {
  id: string
  channel: string
  syncType: string
  status: string
  recordsFetched: number
  recordsCreated: number
  recordsUpdated: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

const CHANNELS = [
  { key: 'coupang', label: '쿠팡', color: 'bg-red-100 text-red-800' },
  { key: 'naver', label: '네이버', color: 'bg-green-100 text-green-800' },
  { key: 'cafe24', label: '카페24', color: 'bg-blue-100 text-blue-800' },
]

export function SyncPanel() {
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logsLoaded, setLogsLoaded] = useState(false)

  const handleSync = async (channel: string) => {
    setSyncing((prev) => ({ ...prev, [channel]: true }))
    setResults((prev) => ({ ...prev, [channel]: { success: true, message: '동기화 중...' } }))

    try {
      const res = await fetch(`/api/sync/${channel}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 7 }),
      })

      const data = await res.json()

      if (data.success) {
        setResults((prev) => ({
          ...prev,
          [channel]: {
            success: true,
            message: `${data.fetched}건 조회 → ${data.created}건 신규, ${data.updated}건 업데이트`,
          },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          [channel]: { success: false, message: data.error ?? '동기화 실패' },
        }))
      }
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [channel]: { success: false, message: e instanceof Error ? e.message : '네트워크 오류' },
      }))
    } finally {
      setSyncing((prev) => ({ ...prev, [channel]: false }))
      loadLogs()
    }
  }

  const loadLogs = async () => {
    try {
      const res = await fetch('/api/sync/status')
      const data = await res.json()
      setLogs(data.logs ?? [])
      setLogsLoaded(true)
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">주문 동기화</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadLogs}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            로그
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {CHANNELS.map((ch) => (
          <div key={ch.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${ch.color}`}>
                {ch.label}
              </Badge>
              {results[ch.key] && (
                <span className={`text-xs ${results[ch.key].success ? 'text-green-600' : 'text-red-600'}`}>
                  {results[ch.key].success ? <Check className="inline h-3 w-3" /> : <X className="inline h-3 w-3" />}
                  {' '}{results[ch.key].message}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={syncing[ch.key]}
              onClick={() => handleSync(ch.key)}
            >
              {syncing[ch.key] ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        ))}

        {/* 최근 동기화 로그 */}
        {logsLoaded && logs.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">최근 로그</p>
            <div className="space-y-1">
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{log.channel}</span>
                    <Badge
                      variant={log.status === 'success' ? 'outline' : log.status === 'error' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {log.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {log.recordsCreated > 0 && <span>+{log.recordsCreated}</span>}
                    <span>{formatDate(log.startedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
