export type Asset = {
  asset_id: string
  type: 'geometry' | 'technical_document'
  filename: string
  mime_type?: string
  status: string
}

export type Requirement = {
  value: string | number | null
  unit?: string | null
  status: string
  source: unknown
  confidence: number | null
  candidates?: Array<{ value: string | number; unit?: string; source: unknown }>
}

export type ManufacturingObject = {
  manufacturing_object_id: string
  customer: { customer_id: string | null; project_name: string | null }
  requirements: Record<string, Requirement>
  order: {
    quantity: { value: number | null; status: string }
    delivery: { requestedDate: string | null; status: string }
    notes: string | null
  }
  part: {
    geometry: {
      dimensions: Record<string, number> | null
      units: string
      volume: number | null
      surface_area: number | null
      watertight: boolean | null
      status: string
    } | null
  }
  validation: {
    status: string
    issues: Array<{ issue_id: string; field: string; type: string; severity: string }>
  }
  extraction_capabilities: {
    geometry: Array<{ asset_id: string; status: string; reason: string | null; notice: string | null }>
    documents: Array<{ asset_id: string; status: string; reason?: string | null }>
  }
}

export type UploadRecord = {
  upload_id: string
  created_at?: string
  status: string
  assets: Asset[]
  customer_input?: Record<string, string>
  manufacturing_object: ManufacturingObject
}

export type OrderInput = Record<string, string>

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  // Prefer a server-side proxy for production credentials.
  if (import.meta.env.VITE_API_KEY) headers.set('Authorization', `Bearer ${import.meta.env.VITE_API_KEY}`)
  let response: Response
  try {
    response = await fetch(`${apiBase}/api/v1/uploads${path}`, { ...options, headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('Cannot reach the backend. Start the API on port 3000 or configure VITE_API_BASE_URL.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `API request failed (${response.status}).`)
  }
  if (response.headers.get('content-type')?.includes('application/json')) return response.json() as Promise<T>
  if (!response.headers.get('content-type')) throw new Error('The API returned an empty response. Check the backend connection.')
  return response.blob() as Promise<T>
}

export const api = {
  async list(signal?: AbortSignal): Promise<UploadRecord[]> {
    const records: UploadRecord[] = []
    let offset = 0
    while (true) {
      const page = await request<{ uploads: UploadRecord[]; has_more: boolean }>(`?limit=100&offset=${offset}`, { signal })
      if (!Array.isArray(page.uploads)) throw new Error('The upload-list endpoint is unavailable. Update and restart the backend.')
      records.push(...page.uploads)
      if (!page.has_more || page.uploads.length === 0) return records
      offset += page.uploads.length
    }
  },
  get: (id: string, signal?: AbortSignal) => request<UploadRecord>(`/${encodeURIComponent(id)}`, { signal }),
  create: (geometry: File[], documents: File[], fields: OrderInput) => {
    const form = new FormData()
    geometry.forEach((file) => form.append('geometry_files[]', file))
    documents.forEach((file) => form.append('documents[]', file))
    Object.entries(fields).forEach(([key, value]) => form.append(key, value))
    return request<UploadRecord>('', { method: 'POST', body: form })
  },
  async update(id: string, fields: OrderInput) {
    await request(`/${encodeURIComponent(id)}/order/extract`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    await request(`/${encodeURIComponent(id)}/compile`, { method: 'POST' })
    return api.get(id)
  },
  async reprocess(id: string) {
    const path = `/${encodeURIComponent(id)}`
    const errors: string[] = []
    for (const stage of ['geometry/extract', 'documents/extract', 'order/extract']) {
      try { await request(`${path}/${stage}`, { method: 'POST' }) }
      catch (error) { errors.push(error instanceof Error ? error.message : 'Extraction failed.') }
    }
    await request(`${path}/compile`, { method: 'POST' })
    return { record: await api.get(id), errors }
  },
  async file(id: string, asset: Asset) {
    const blob = await request<Blob>(`/${encodeURIComponent(id)}/assets/${encodeURIComponent(asset.asset_id)}/file`)
    return new File([blob], asset.filename, { type: blob.type })
  },
}

export function recordName(record: UploadRecord) {
  return record.manufacturing_object.customer.project_name || record.assets[0]?.filename || 'Untitled upload'
}

export function canPreview(filename: string) { return /\.(step|stp|iges|igs|stl|obj)$/i.test(filename) }

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function errorText(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.' }
