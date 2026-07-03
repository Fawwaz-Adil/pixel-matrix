'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyBrightness, applyContrast, applySaturation, applySharpness,
  applyVignette, applyGrain, applyColorFilter,
  blurRegion, pixelateRegion, lightenRegion, darkenRegion,
  blobUrlToImageData, imageDataToBlob, scaleImageData,
  type ColorFilterName,
} from '@/lib/imageOps'
import { applyFilter as callBackendFilter, type FilterType } from '@/lib/api'

export interface Adjustments {
  brightness: number; contrast: number; saturation: number
  sharpness: number; blur: number; vignette: number; grain: number
}
export type ActiveTool = 'none' | 'blur' | 'pixelate' | 'lighten' | 'darken'

export const DEFAULT_ADJ: Adjustments = {
  brightness:0, contrast:0, saturation:0, sharpness:0, blur:0, vignette:0, grain:0,
}

const MAX_DIMENSION = 8192

function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height)
}

export function useImageEditor() {
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)
  const sourceRef   = useRef<ImageData | null>(null)
  const originalRef = useRef<ImageData | null>(null)

  // "latest ref" pattern — render() reads these instead of closing over state
  const stateRef = useRef({ adjustments: DEFAULT_ADJ, colorFilter: 'none' as ColorFilterName, rotation: 0, flipX: false, flipY: false, comparing: false })
  const toolRef  = useRef({ activeTool: 'none' as ActiveTool, brushSize: 30, brushStrength: 40 })

  // Undo / redo stacks
  const undoStack = useRef<ImageData[]>([])
  const redoStack = useRef<ImageData[]>([])

  const [hasImage,     setHasImage]     = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [adjustments,  setAdjustments]  = useState<Adjustments>(DEFAULT_ADJ)
  const [colorFilter,  setColorFilter]  = useState<ColorFilterName>('none')
  const [rotation,     setRotation]     = useState(0)
  const [flipX,        setFlipX]        = useState(false)
  const [flipY,        setFlipY]        = useState(false)
  const [comparing,    setComparing]    = useState(false)
  const [activeTool,   setActiveTool]   = useState<ActiveTool>('none')
  const [brushSize,    setBrushSize]    = useState(30)
  const [brushStrength,setBrushStrength]= useState(40)
  const [canUndo,      setCanUndo]      = useState(false)
  const [canRedo,      setCanRedo]      = useState(false)
  const [imageDims,    setImageDims]    = useState<{w:number;h:number}|null>(null)
  const [renderKey,    setRenderKey]    = useState(0)

  stateRef.current = { adjustments, colorFilter, rotation, flipX, flipY, comparing }
  toolRef.current  = { activeTool, brushSize, brushStrength }

  const clearError = useCallback(() => setError(null), [])

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const s = sourceRef.current; if (!s) return
    undoStack.current.push(cloneImageData(s))
    if (undoStack.current.length > 25) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true); setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop(); if (!prev) return
    const cur = sourceRef.current; if (cur) redoStack.current.push(cloneImageData(cur))
    sourceRef.current = prev
    setImageDims({ w: prev.width, h: prev.height })
    setCanUndo(undoStack.current.length > 0); setCanRedo(true)
    setRenderKey(k => k + 1)
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop(); if (!next) return
    const cur = sourceRef.current; if (cur) undoStack.current.push(cloneImageData(cur))
    sourceRef.current = next
    setImageDims({ w: next.width, h: next.height })
    setCanUndo(true); setCanRedo(redoStack.current.length > 0)
    setRenderKey(k => k + 1)
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current, src = sourceRef.current
    if (!canvas || !src) return
    const ctx = canvas.getContext('2d')!
    const { adjustments: adj, colorFilter: cf, rotation: rot, flipX: fx, flipY: fy, comparing: cmp } = stateRef.current

    // Hold-to-compare: show the untouched original
    if (cmp && originalRef.current) {
      const orig = originalRef.current
      canvas.width = orig.width; canvas.height = orig.height
      ctx.putImageData(orig, 0, 0)
      return
    }

    const W = src.width, H = src.height

    let work = new ImageData(new Uint8ClampedArray(src.data), W, H)
    if (adj.sharpness > 0) work = applySharpness(work, adj.sharpness)
    const d = work.data
    applyColorFilter(d, cf)
    if (adj.brightness !== 0) applyBrightness(d, adj.brightness)
    if (adj.contrast   !== 0) applyContrast(d, adj.contrast)
    if (adj.saturation !== 0) applySaturation(d, adj.saturation)
    if (adj.vignette   > 0)   applyVignette(d, W, H, adj.vignette / 100)
    if (adj.grain      > 0)   applyGrain(d, adj.grain)

    const off = document.createElement('canvas')
    off.width = W; off.height = H
    off.getContext('2d')!.putImageData(work, 0, 0)

    const rad = (rot * Math.PI) / 180
    const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad))
    canvas.width  = Math.round(W * cos + H * sin)
    canvas.height = Math.round(W * sin + H * cos)

    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(rad)
    ctx.scale(fx ? -1 : 1, fy ? -1 : 1)
    if (adj.blur > 0) ctx.filter = `blur(${adj.blur}px)`
    ctx.drawImage(off, -W / 2, -H / 2)
    ctx.filter = 'none'
    ctx.restore()
  }, [])

  useEffect(() => { render() }, [adjustments, colorFilter, rotation, flipX, flipY, comparing, renderKey, render])

  // ── Load image ──────────────────────────────────────────────────────────────
  const loadImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image — please choose a PNG, JPG or WEBP.')
      return
    }
    setError(null)
    try {
      const { imgData } = await blobUrlToImageData(URL.createObjectURL(file))
      sourceRef.current = imgData
      originalRef.current = cloneImageData(imgData)
      undoStack.current = []; redoStack.current = []
      setCanUndo(false); setCanRedo(false)
      setAdjustments(DEFAULT_ADJ); setColorFilter('none')
      setRotation(0); setFlipX(false); setFlipY(false)
      setComparing(false); setActiveTool('none')
      setImageDims({ w: imgData.width, h: imgData.height })
      setHasImage(true)
      setRenderKey(k => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load image.')
    }
  }, [])

  // ── Algorithm ───────────────────────────────────────────────────────────────
  // Sends the CURRENT image (with all edits baked in, EXIF already normalised by
  // the browser) and restores the original dimensions if the backend downscaled.
  const applyAlgorithm = useCallback(async (
    filter: FilterType,
    params: { kernelSize: number; sigma: number; k: number }
  ) => {
    const src = sourceRef.current
    if (!src) return
    setLoading(true); setError(null)
    try {
      const payload = await imageDataToBlob(src)
      const resultBlob = await callBackendFilter(payload, filter, params)
      let { imgData } = await blobUrlToImageData(URL.createObjectURL(resultBlob))
      if (imgData.width !== src.width || imgData.height !== src.height) {
        imgData = scaleImageData(imgData, src.width, src.height)
      }
      pushHistory()
      sourceRef.current = imgData
      setImageDims({ w: imgData.width, h: imgData.height })
      setRenderKey(k => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Processing failed.')
    } finally {
      setLoading(false)
    }
  }, [pushHistory])

  // ── Brush ───────────────────────────────────────────────────────────────────
  const doPaint = useCallback((cx: number, cy: number) => {
    const src = sourceRef.current, canvas = canvasRef.current
    if (!src || !canvas) return
    const { rotation: rot, flipX: fx, flipY: fy, comparing: cmp } = stateRef.current
    if (cmp) return

    // Canvas coords → source coords: invert the render transform so strokes
    // land where the cursor is even when the view is rotated or flipped
    const rad = (-rot * Math.PI) / 180
    const dx = cx - canvas.width / 2, dy = cy - canvas.height / 2
    let sx = dx * Math.cos(rad) - dy * Math.sin(rad)
    let sy = dx * Math.sin(rad) + dy * Math.cos(rad)
    if (fx) sx = -sx
    if (fy) sy = -sy
    const x = sx + src.width / 2, y = sy + src.height / 2

    const { activeTool: tool, brushSize: bs, brushStrength: str } = toolRef.current
    switch (tool) {
      case 'blur':      blurRegion(src, x, y, bs, str / 5); break
      case 'pixelate':  pixelateRegion(src, x, y, bs, Math.max(4, str / 5 | 0)); break
      case 'lighten':   lightenRegion(src, x, y, bs, str); break
      case 'darken':    darkenRegion(src, x, y, bs, str); break
    }
    render()
  }, [render])

  // ── Transform ───────────────────────────────────────────────────────────────
  const rotateCW  = useCallback(() => setRotation(r => (r + 90) % 360), [])
  const rotateCCW = useCallback(() => setRotation(r => (r - 90 + 360) % 360), [])
  const doFlipX   = useCallback(() => setFlipX(v => !v), [])
  const doFlipY   = useCallback(() => setFlipY(v => !v), [])

  const applyResize = useCallback((w: number, h: number) => {
    const src = sourceRef.current; if (!src) return
    w = Math.round(w); h = Math.round(h)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 || w > MAX_DIMENSION || h > MAX_DIMENSION) {
      setError(`Resize dimensions must be between 1 and ${MAX_DIMENSION} px.`)
      return
    }
    pushHistory()
    sourceRef.current = scaleImageData(src, w, h)
    setImageDims({ w, h })
    setRenderKey(k => k + 1)
  }, [pushHistory])

  const applyCrop = useCallback((top: number, right: number, bottom: number, left: number) => {
    const src = sourceRef.current; if (!src) return
    pushHistory()
    const W = src.width, H = src.height
    const x  = Math.round(left   / 100 * W), y  = Math.round(top    / 100 * H)
    const x2 = Math.round((1 - right  / 100) * W), y2 = Math.round((1 - bottom / 100) * H)
    const cw = Math.max(1, x2 - x), ch = Math.max(1, y2 - y)
    const tmp = document.createElement('canvas')
    tmp.width = src.width; tmp.height = src.height
    tmp.getContext('2d')!.putImageData(src, 0, 0)
    const out = document.createElement('canvas')
    out.width = cw; out.height = ch
    out.getContext('2d')!.drawImage(tmp, x, y, cw, ch, 0, 0, cw, ch)
    sourceRef.current = out.getContext('2d')!.getImageData(0, 0, cw, ch)
    setImageDims({ w: cw, h: ch })
    setRenderKey(k => k + 1)
  }, [pushHistory])

  // ── Compare & reset ──────────────────────────────────────────────────────────
  const startCompare = useCallback(() => { if (originalRef.current) setComparing(true) }, [])
  const endCompare   = useCallback(() => setComparing(false), [])

  const resetImage = useCallback(() => {
    const orig = originalRef.current; if (!orig) return
    pushHistory()
    sourceRef.current = cloneImageData(orig)
    setAdjustments(DEFAULT_ADJ); setColorFilter('none')
    setRotation(0); setFlipX(false); setFlipY(false)
    setImageDims({ w: orig.width, h: orig.height })
    setRenderKey(k => k + 1)
  }, [pushHistory])

  // ── Download ─────────────────────────────────────────────────────────────────
  const downloadImage = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas || !sourceRef.current) return
    if (stateRef.current.comparing) { setComparing(false); return }
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'pixel-matrix-edit.png'
    a.click()
  }, [])

  return {
    canvasRef, hasImage, loading, error, clearError, imageDims,
    adjustments, setAdjustments,
    colorFilter, setColorFilter,
    rotation, flipX, flipY,
    comparing, startCompare, endCompare, resetImage,
    activeTool, setActiveTool,
    brushSize, setBrushSize,
    brushStrength, setBrushStrength,
    canUndo, canRedo, undo, redo, pushHistory,
    loadImage, applyAlgorithm, doPaint,
    rotateCW, rotateCCW, doFlipX, doFlipY,
    applyResize, applyCrop,
    downloadImage,
  }
}
