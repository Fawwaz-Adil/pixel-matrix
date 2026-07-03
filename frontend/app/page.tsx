'use client'

import { useEffect, useRef } from 'react'
import { useImageEditor } from '@/hooks/useImageEditor'
import ImageCanvas from '@/components/ImageCanvas'
import ControlPanel from '@/components/ControlPanel'

// ── SVG icon helpers ──────────────────────────────────────────────────────────
function Ico({ children, size=16 }: { children: React.ReactNode; size?: number }) {
  return <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
}

const TOOL_LABEL: Record<string,string> = { blur:'Blur Brush', pixelate:'Mosaic Brush', lighten:'Dodge', darken:'Burn' }

export default function Home() {
  const ed = useImageEditor()
  const uploadRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'range'))
    }
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey
      if (mod && !e.shiftKey && key === 'z') { e.preventDefault(); ed.undo() }
      else if (mod && (key === 'y' || (e.shiftKey && key === 'z'))) { e.preventDefault(); ed.redo() }
      else if (mod && key === 'o') { e.preventDefault(); uploadRef.current?.click() }
      else if (mod && key === 's') { e.preventDefault(); ed.downloadImage() }
      else if (!mod && key === 'c' && !e.repeat) ed.startCompare()
    }
    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c') ed.endCompare()
    }
    const blur = () => ed.endCompare()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
  }, [ed])

  // Warn before leaving with unsaved edits
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (ed.canUndo) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [ed.canUndo])

  // Auto-dismiss errors
  useEffect(() => {
    if (!ed.error) return
    const t = setTimeout(ed.clearError, 6000)
    return () => clearTimeout(t)
  }, [ed.error, ed.clearError])

  const iconBtn = "p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all active:scale-90"

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{background:'#08080f'}}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="h-[52px] shrink-0 flex items-center px-4 gap-2 border-b border-white/[0.06] z-30"
        style={{background:'rgba(10,10,20,0.9)', backdropFilter:'blur(20px)'}}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30"
            style={{background:'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)'}}>
            <span className="text-white text-[10px] font-black tracking-tight">PM</span>
          </div>
          <span className="font-bold text-sm grad-text hidden sm:block">Pixel Matrix</span>
        </div>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Upload */}
        <button onClick={()=>uploadRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all active:scale-95"
          title="Upload image (Ctrl+O)">
          <Ico><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></Ico>
          <span className="hidden sm:inline">Upload</span>
        </button>
        <input ref={uploadRef} type="file" accept="image/*" className="hidden"
          onChange={e=>{ const f=e.target.files?.[0]; if(f) ed.loadImage(f); e.target.value='' }} />

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Undo / Redo */}
        <div className="flex items-center">
          <button onClick={ed.undo} disabled={!ed.canUndo} title="Undo (Ctrl+Z)" className={iconBtn}>
            <Ico><path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"/></Ico>
          </button>
          <button onClick={ed.redo} disabled={!ed.canRedo} title="Redo (Ctrl+Y)" className={iconBtn}>
            <Ico><path d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"/></Ico>
          </button>
        </div>

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Compare (hold) + Reset */}
        <div className="flex items-center">
          <button
            disabled={!ed.hasImage}
            title="Hold to see the original (or hold C)"
            className={`${iconBtn} ${ed.comparing ? 'bg-indigo-600/30 text-indigo-300' : ''}`}
            onPointerDown={ed.startCompare}
            onPointerUp={ed.endCompare}
            onPointerLeave={ed.endCompare}
            onContextMenu={e => e.preventDefault()}>
            <Ico><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></Ico>
          </button>
          <button onClick={ed.resetImage} disabled={!ed.hasImage} title="Reset to original (undoable)" className={iconBtn}>
            <Ico><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></Ico>
          </button>
        </div>

        {/* Active tool badge */}
        {ed.activeTool !== 'none' && (
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.3)',color:'#a5b4fc'}}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            {TOOL_LABEL[ed.activeTool]}
          </span>
        )}

        {/* Comparing badge */}
        {ed.comparing && (
          <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
            style={{background:'rgba(16,185,129,.15)',border:'1px solid rgba(16,185,129,.3)',color:'#6ee7b7'}}>
            Original
          </span>
        )}

        <div className="flex-1" />

        {/* Image dims */}
        {ed.imageDims && (
          <span className="text-[11px] text-gray-600 hidden md:block tabular-nums">
            {ed.imageDims.w} × {ed.imageDims.h} px
          </span>
        )}

        <div className="w-px h-5 bg-white/[0.08]" />

        {/* Download */}
        <button onClick={ed.downloadImage} disabled={!ed.hasImage}
          title="Save image (Ctrl+S)"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed glow-emerald"
          style={ed.hasImage ? {background:'linear-gradient(135deg,#059669,#0d9488)'} : {background:'#1a1a2e'}}>
          <Ico><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></Ico>
          <span className="hidden sm:inline">Save</span>
        </button>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <aside className="w-[268px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden"
          style={{background:'rgba(11,11,20,0.95)'}}>
          <ControlPanel
            loading={ed.loading}
            hasImage={ed.hasImage}
            imageDims={ed.imageDims}
            onApplyAlgorithm={ed.applyAlgorithm}
            colorFilter={ed.colorFilter}
            onColorFilterChange={ed.setColorFilter}
            adjustments={ed.adjustments}
            onAdjustmentsChange={ed.setAdjustments}
            onRotateCW={ed.rotateCW}
            onRotateCCW={ed.rotateCCW}
            onFlipX={ed.doFlipX}
            onFlipY={ed.doFlipY}
            onResize={ed.applyResize}
            onCrop={ed.applyCrop}
            activeTool={ed.activeTool}
            setActiveTool={ed.setActiveTool}
            brushSize={ed.brushSize}
            setBrushSize={ed.setBrushSize}
            brushStrength={ed.brushStrength}
            setBrushStrength={ed.setBrushStrength}
          />
        </aside>

        {/* Canvas area */}
        <main className="flex-1 overflow-auto p-6 flex items-center justify-center"
          style={{background:'radial-gradient(ellipse at 60% 40%, rgba(99,102,241,.04) 0%, transparent 60%), #08080f'}}>
          <ImageCanvas
            canvasRef={ed.canvasRef}
            hasImage={ed.hasImage}
            activeTool={ed.activeTool}
            brushSize={ed.brushSize}
            onBrushStart={ed.pushHistory}
            onBrushPaint={ed.doPaint}
            onUpload={ed.loadImage}
            loading={ed.loading}
          />
        </main>
      </div>

      {/* ── Error toast ──────────────────────────────────────────────────── */}
      {ed.error && (
        <div className="fixed bottom-12 right-4 z-50 toast-in">
          <div className="flex items-start gap-3 max-w-sm px-4 py-3 rounded-xl shadow-2xl"
            style={{background:'rgba(30,10,16,0.95)', border:'1px solid rgba(239,68,68,.35)', backdropFilter:'blur(12px)'}}>
            <span className="mt-0.5 text-red-400 shrink-0">
              <Ico><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></Ico>
            </span>
            <p className="text-xs text-red-200 leading-relaxed">{ed.error}</p>
            <button onClick={ed.clearError} className="text-red-400/60 hover:text-red-300 shrink-0 transition-colors" aria-label="Dismiss">
              <Ico size={14}><path d="M6 18L18 6M6 6l12 12"/></Ico>
            </button>
          </div>
        </div>
      )}

      {/* ── Keyboard hint bar ────────────────────────────────────────────── */}
      <footer className="h-7 shrink-0 hidden sm:flex items-center px-4 gap-4 border-t border-white/[0.04]"
        style={{background:'rgba(8,8,15,0.8)'}}>
        {[['Ctrl+Z','Undo'],['Ctrl+Y','Redo'],['Ctrl+O','Open'],['Ctrl+S','Save'],['Hold C','Compare']].map(([k,l])=>(
          <span key={k} className="flex items-center gap-1.5 text-[10px] text-gray-700">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-600 font-mono text-[9px]">{k}</kbd>
            {l}
          </span>
        ))}
      </footer>
    </div>
  )
}
