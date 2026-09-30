import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorText } from './api'
import type { UploadRecord } from './api'

export function useUploads() {
  const [records, setRecords] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const refresh = useCallback(async () => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setLoading(true)
    setError('')
    try {
      const result = await api.list(current.signal)
      if (!current.signal.aborted) setRecords(result)
    } catch (error) {
      if (!current.signal.aborted) setError(errorText(error))
    } finally {
      if (!current.signal.aborted) setLoading(false)
    }
  }, [])
  const upsert = useCallback((record: UploadRecord) => {
    setRecords((current) => [record, ...current.filter((item) => item.upload_id !== record.upload_id)]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '') || b.upload_id.localeCompare(a.upload_id)))
  }, [])
  useEffect(() => {
    void refresh()
    return () => controller.current?.abort()
  }, [refresh])
  return { records, loading, error, refresh, upsert }
}
