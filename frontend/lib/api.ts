const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

export type FilterType = 'gaussian' | 'sobel' | 'kmeans'

export interface FilterParams {
  kernelSize: number
  sigma: number
  k: number
}

const TIMEOUT_MS = 60_000

export async function applyFilter(
  image: Blob,
  filter: FilterType,
  params: FilterParams,
): Promise<Blob> {
  const form = new FormData()
  form.append('image', image, 'image.png')

  if (filter === 'gaussian') {
    form.append('kernel_size', String(params.kernelSize))
    form.append('sigma', String(params.sigma))
  } else if (filter === 'kmeans') {
    form.append('k', String(params.k))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/${filter}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Processing timed out — try a smaller image or lower settings.')
    }
    throw new Error('Could not reach the processing server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = ` — ${body.detail}`
    } catch { /* non-JSON error body */ }
    throw new Error(`Processing failed (HTTP ${res.status})${detail}`)
  }

  return res.blob()
}
