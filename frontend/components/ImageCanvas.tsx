'use client'

import { useRef, useState, type RefObject } from 'react'
import type { ActiveTool } from '@/hooks/useImageEditor'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  hasImage: boolean
  activeTool: ActiveTool
  brushSize: number
  onBrushStart: () => void
  onBrushPaint: (x: number, y: number) => void
  onUpload: (file: File) => void
  loading: boolean
}

export default function ImageCanvas({
  canvasRef, hasImage, activeTool, brushSize,
  onBrushStart, onBrushPaint, onUpload, loading,
}: Props) {
  const painting   = useRef(false)
  const [cursor, setCursor] = useState<{x:number;y:number}|null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: (e.clientX - r.left)  * (c.width  / r.width),
      y: (e.clientY - r.top)   * (c.height / r.height),
    }
  }

  const scaledBrush = canvasRef.current
    ? brushSize * (canvasRef.current.getBoundingClientRect().width / canvasRef.current.width)
    : brushSize

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {hasImage ? (
        <div className="relative group">
          {/* Glow backdrop */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Canvas wrapper with checkerboard */}
          <div className="relative rounded-2xl overflow-hidden checkerboard shadow-2xl ring-1 ring-white/10">
            {/* Brush ring */}
            {activeTool !== 'none' && cursor && (
              <div
                className="pointer-events-none absolute rounded-full border-2 border-white/70 mix-blend-difference z-20 transition-none"
                style={{
                  width:  scaledBrush * 2,
                  height: scaledBrush * 2,
                  left:   cursor.x - scaledBrush,
                  top:    cursor.y - scaledBrush,
                }}
              />
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Processing…</span>
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef as RefObject<HTMLCanvasElement>}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 160px)',
                display: 'block',
                cursor: activeTool !== 'none' ? 'none' : 'default',
              }}
              onMouseDown={e => {
                if (activeTool === 'none') return
                onBrushStart()
                painting.current = true
                const c = getCoords(e); onBrushPaint(c.x, c.y)
              }}
              onMouseMove={e => {
                const r = canvasRef.current?.getBoundingClientRect()
                if (r) setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
                if (!painting.current || activeTool === 'none') return
                const c = getCoords(e); onBrushPaint(c.x, c.y)
              }}
              onMouseUp={() => { painting.current = false }}
              onMouseLeave={() => { painting.current = false; setCursor(null) }}
            />
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div
          className={`flex flex-col items-center gap-5 p-12 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none
            ${drag
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          onClick={() => inputRef.current?.click()}
          onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files[0]; if(f?.type.startsWith('image/')) onUpload(f) }}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
            <svg className="w-9 h-9 text-indigo-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H3.75a.75.75 0 01-.75-.75V3.75A.75.75 0 013.75 3z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-medium">Drop image here</p>
            <p className="text-gray-600 text-sm mt-1">or click to browse · PNG, JPG, WEBP</p>
          </div>
          <span className="px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 transition-colors">
            Choose file
          </span>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f=e.target.files?.[0]; if(f) onUpload(f) }} />
        </div>
      )}
    </div>
  )
}
