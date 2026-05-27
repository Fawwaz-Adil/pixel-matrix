const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type FilterType = 'gaussian' | 'sobel' | 'kmeans'

export interface FilterParams {
  kernelSize: number
  sigma: number
  k: number
}

export async function applyFilter(
  file: File,
  filter: FilterType,
  params: FilterParams,
): Promise<string> {
  const form = new FormData()
  form.append('image', file)

  if (filter === 'gaussian') {
    form.append('kernel_size', String(params.kernelSize))
    form.append('sigma', String(params.sigma))
  } else if (filter === 'kmeans') {
    form.append('k', String(params.k))
  }

  const res = await fetch(`${API_BASE}/api/${filter}`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Server error ${res.status}`)

  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
