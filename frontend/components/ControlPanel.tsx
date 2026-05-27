'use client'

import { useState } from 'react'
import type { Adjustments, ActiveTool } from '@/hooks/useImageEditor'
import { COLOR_FILTER_LABELS, type ColorFilterName } from '@/lib/imageOps'
import type { FilterType } from '@/lib/api'

// ── Icons ─────────────────────────────────────────────────────────────────────

const I = {
  sparkles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />,
  swatch: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />,
  sliders: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />,
  transform: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />,
  brush: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />,
}
const Icon = ({ d, size=16 }: { d: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">{d}</svg>
)

// ── Shared Slider ─────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step=1, onChange, display }: {
  label: string; value: number; min: number; max: number
  step?: number; onChange:(v:number)=>void; display?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-mono text-gray-300">{display ?? value}</span>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none w-full">
          <div className="h-[3px] rounded-full bg-indigo-500/30" style={{width:`${pct}%`}} />
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(Number(e.target.value))} className="relative" />
      </div>
    </div>
  )
}

// ── Algorithms Tab ────────────────────────────────────────────────────────────

function AlgorithmsTab({ onApply, loading }: {
  onApply:(f:FilterType,p:{kernelSize:number;sigma:number;k:number})=>void; loading:boolean
}) {
  const [filter, setFilter] = useState<FilterType>('gaussian')
  const [ks, setKs] = useState(5); const [sigma, setSigma] = useState(1.0); const [k, setK] = useState(8)

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-600 leading-relaxed">Backend-processed algorithms — results replace the source image.</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(['gaussian','sobel','kmeans'] as FilterType[]).map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`py-2 text-[11px] rounded-xl font-semibold transition-all duration-150 ${filter===f
              ?'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
              :'bg-white/[0.04] text-gray-500 hover:bg-white/[0.07] hover:text-gray-300'}`}>
            {f==='gaussian'?'Gaussian':f==='sobel'?'Sobel':'K-Means'}
          </button>
        ))}
      </div>
      <div className="space-y-3 bg-white/[0.02] rounded-xl p-3">
        {filter==='gaussian' && <>
          <Slider label="Kernel size" value={ks} min={3} max={21} step={2} onChange={setKs} display={`${ks}×${ks}`} />
          <Slider label="Sigma σ" value={sigma} min={0.1} max={5} step={0.1} onChange={setSigma} display={sigma.toFixed(1)} />
        </>}
        {filter==='sobel' && <p className="text-xs text-gray-600 py-2">Detects edges — <span className="font-mono text-gray-500">G = √(Gx²+Gy²)</span></p>}
        {filter==='kmeans' && <Slider label="Palette K" value={k} min={2} max={32} onChange={setK} />}
      </div>
      <button onClick={()=>onApply(filter,{kernelSize:ks,sigma,k})} disabled={loading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Processing
          </span>
        ) : 'Apply to Source'}
      </button>
    </div>
  )
}

// ── Filters Tab ───────────────────────────────────────────────────────────────

const FILTER_COLORS: Partial<Record<ColorFilterName,string>> = {
  red:'#ef4444', green:'#22c55e', blue:'#3b82f6', sepia:'#d97706',
  grayscale:'#6b7280', invert:'#a855f7', cool:'#0ea5e9', warm:'#f97316',
  vintage:'#84cc16', dramatic:'#1e293b', matte:'#94a3b8', fade:'#cbd5e1',
  cyberpunk:'#ec4899', noir:'#1f2937',
}

function FiltersTab({ value, onChange }: { value: ColorFilterName; onChange:(f:ColorFilterName)=>void }) {
  const filters = Object.keys(COLOR_FILTER_LABELS) as ColorFilterName[]
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-600">Instant color presets applied client-side.</p>
      <div className="grid grid-cols-3 gap-1.5">
        {filters.map(f=>(
          <button key={f} onClick={()=>onChange(f)}
            className={`py-2.5 text-[11px] rounded-xl font-medium transition-all duration-150 relative overflow-hidden ${value===f
              ?'text-white ring-1 ring-white/30 shadow-lg'
              :'text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]'}`}
            style={value===f ? { background:`linear-gradient(135deg,${FILTER_COLORS[f]??'#6366f1'}88,${FILTER_COLORS[f]??'#6366f1'}44)` } : {}}>
            {COLOR_FILTER_LABELS[f]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Adjust Tab ────────────────────────────────────────────────────────────────

function AdjustTab({ adj, onChange }: { adj: Adjustments; onChange:(a:Adjustments)=>void }) {
  const set = (k: keyof Adjustments) => (v: number) => onChange({ ...adj, [k]: v })
  return (
    <div className="space-y-1">
      <div className="space-y-3 pb-3 border-b border-white/[0.06]">
        <p className="text-[11px] text-gray-600 uppercase tracking-wider">Tone</p>
        <Slider label="Brightness" value={adj.brightness} min={-100} max={100} onChange={set('brightness')} />
        <Slider label="Contrast"   value={adj.contrast}   min={-100} max={100} onChange={set('contrast')} />
        <Slider label="Saturation" value={adj.saturation} min={-100} max={100} onChange={set('saturation')} />
      </div>
      <div className="space-y-3 py-3 border-b border-white/[0.06]">
        <p className="text-[11px] text-gray-600 uppercase tracking-wider">Detail</p>
        <Slider label="Sharpness" value={adj.sharpness} min={0} max={100} onChange={set('sharpness')} />
        <Slider label="Blur"      value={adj.blur}      min={0} max={20}  onChange={set('blur')} display={`${adj.blur}px`} />
      </div>
      <div className="space-y-3 pt-3">
        <p className="text-[11px] text-gray-600 uppercase tracking-wider">Effects</p>
        <Slider label="Vignette" value={adj.vignette} min={0} max={100} onChange={set('vignette')} />
        <Slider label="Grain"    value={adj.grain}    min={0} max={100} onChange={set('grain')} />
      </div>
      <button onClick={()=>onChange({brightness:0,contrast:0,saturation:0,sharpness:0,blur:0,vignette:0,grain:0})}
        className="mt-3 w-full py-1.5 text-[11px] rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-gray-500 hover:text-gray-300 transition-all">
        Reset all adjustments
      </button>
    </div>
  )
}

// ── Transform Tab ─────────────────────────────────────────────────────────────

function TransformTab({ onRotateCW,onRotateCCW,onFlipX,onFlipY,onResize,onCrop }: {
  onRotateCW:()=>void; onRotateCCW:()=>void; onFlipX:()=>void; onFlipY:()=>void
  onResize:(w:number,h:number)=>void; onCrop:(t:number,r:number,b:number,l:number)=>void
}) {
  const [rw,setRw]=useState(512); const [rh,setRh]=useState(512)
  const [ct,setCt]=useState(0); const [cr,setCr]=useState(0); const [cb,setCb]=useState(0); const [cl,setCl]=useState(0)
  const btnCls = "py-2 rounded-xl text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.09] text-gray-300 transition-all active:scale-95"

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Rotate & Flip</p>
        <div className="grid grid-cols-4 gap-1.5">
          <button onClick={onRotateCCW} className={btnCls}>↺ CCW</button>
          <button onClick={onRotateCW}  className={btnCls}>↻ CW</button>
          <button onClick={onFlipX}     className={btnCls}>↔ H</button>
          <button onClick={onFlipY}     className={btnCls}>↕ V</button>
        </div>
      </div>
      <div>
        <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Resize</p>
        <div className="flex gap-2 items-end">
          <label className="flex-1 text-[11px] text-gray-500">
            W (px)
            <input type="number" value={rw} min={1} max={4096} onChange={e=>setRw(+e.target.value)}
              className="mt-1 w-full px-2.5 py-2 text-sm bg-[#0a0a15] border border-white/[0.08] rounded-xl text-gray-200 focus:outline-none focus:border-indigo-500/60 transition-colors" />
          </label>
          <label className="flex-1 text-[11px] text-gray-500">
            H (px)
            <input type="number" value={rh} min={1} max={4096} onChange={e=>setRh(+e.target.value)}
              className="mt-1 w-full px-2.5 py-2 text-sm bg-[#0a0a15] border border-white/[0.08] rounded-xl text-gray-200 focus:outline-none focus:border-indigo-500/60 transition-colors" />
          </label>
          <button onClick={()=>onResize(rw,rh)}
            className="px-3 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
            Apply
          </button>
        </div>
      </div>
      <div>
        <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Crop (trim %)</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {([['Top',ct,setCt],['Right',cr,setCr],['Bottom',cb,setCb],['Left',cl,setCl]] as [string,number,(v:number)=>void][]).map(([l,v,fn])=>(
            <Slider key={l} label={l} value={v} min={0} max={49} onChange={fn} display={`${v}%`} />
          ))}
        </div>
        <button onClick={()=>onCrop(ct,cr,cb,cl)}
          className="mt-3 w-full py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all active:scale-95">
          Apply Crop
        </button>
      </div>
    </div>
  )
}

// ── Brush Tab ─────────────────────────────────────────────────────────────────

const TOOLS: { id: ActiveTool; label: string; emoji: string; desc: string; color: string }[] = [
  { id:'none',     label:'Off',      emoji:'○', desc:'No brush',        color:'text-gray-500' },
  { id:'blur',     label:'Blur',     emoji:'◌', desc:'Smooth regions',  color:'text-blue-400' },
  { id:'pixelate', label:'Mosaic',   emoji:'▦', desc:'Pixelate brush',  color:'text-purple-400' },
  { id:'lighten',  label:'Dodge',    emoji:'☀', desc:'Lighten pixels',  color:'text-yellow-400' },
  { id:'darken',   label:'Burn',     emoji:'●', desc:'Darken pixels',   color:'text-orange-400' },
]

function BrushTab({ activeTool,setActiveTool,brushSize,setBrushSize,brushStrength,setBrushStrength }: {
  activeTool:ActiveTool; setActiveTool:(t:ActiveTool)=>void
  brushSize:number; setBrushSize:(v:number)=>void
  brushStrength:number; setBrushStrength:(v:number)=>void
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] text-gray-600 leading-relaxed">Hold and drag on the canvas. Strokes are baked into the source — use undo to reverse.</p>
      <div className="space-y-1.5">
        {TOOLS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTool(t.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${activeTool===t.id
              ?'bg-indigo-600/25 ring-1 ring-indigo-500/40 text-white'
              :'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'}`}>
            <span className={`text-lg w-6 text-center ${t.color}`}>{t.emoji}</span>
            <span className="font-medium">{t.label}</span>
            <span className="ml-auto text-[11px] text-gray-600">{t.desc}</span>
            {activeTool===t.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
          </button>
        ))}
      </div>
      {activeTool !== 'none' && (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
          <Slider label="Brush size" value={brushSize}     min={5} max={150} onChange={setBrushSize}     display={`${brushSize}px`} />
          <Slider label="Strength"   value={brushStrength} min={5} max={100} onChange={setBrushStrength} />
        </div>
      )}
    </div>
  )
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type Tab = 'Algorithms'|'Filters'|'Adjust'|'Transform'|'Brush'
const TABS: { id: Tab; icon: React.ReactNode }[] = [
  { id:'Algorithms', icon: <Icon d={I.sparkles} /> },
  { id:'Filters',    icon: <Icon d={I.swatch} /> },
  { id:'Adjust',     icon: <Icon d={I.sliders} /> },
  { id:'Transform',  icon: <Icon d={I.transform} /> },
  { id:'Brush',      icon: <Icon d={I.brush} /> },
]

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  loading: boolean
  onApplyAlgorithm:(f:FilterType,p:{kernelSize:number;sigma:number;k:number})=>void
  colorFilter:ColorFilterName; onColorFilterChange:(f:ColorFilterName)=>void
  adjustments:Adjustments; onAdjustmentsChange:(a:Adjustments)=>void
  onRotateCW:()=>void; onRotateCCW:()=>void; onFlipX:()=>void; onFlipY:()=>void
  onResize:(w:number,h:number)=>void; onCrop:(t:number,r:number,b:number,l:number)=>void
  activeTool:ActiveTool; setActiveTool:(t:ActiveTool)=>void
  brushSize:number; setBrushSize:(v:number)=>void
  brushStrength:number; setBrushStrength:(v:number)=>void
}

export default function ControlPanel(p: Props) {
  const [tab, setTab] = useState<Tab>('Algorithms')

  return (
    <div className="flex flex-col h-full">
      {/* Icon tab bar */}
      <div className="flex border-b border-white/[0.06] shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} title={t.id}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-all duration-150 relative ${tab===t.id
              ?'text-indigo-400'
              :'text-gray-600 hover:text-gray-400'}`}>
            {t.icon}
            <span>{t.id}</span>
            {tab===t.id && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {tab==='Algorithms' && <AlgorithmsTab onApply={p.onApplyAlgorithm} loading={p.loading} />}
        {tab==='Filters'    && <FiltersTab value={p.colorFilter} onChange={p.onColorFilterChange} />}
        {tab==='Adjust'     && <AdjustTab adj={p.adjustments} onChange={p.onAdjustmentsChange} />}
        {tab==='Transform'  && <TransformTab onRotateCW={p.onRotateCW} onRotateCCW={p.onRotateCCW} onFlipX={p.onFlipX} onFlipY={p.onFlipY} onResize={p.onResize} onCrop={p.onCrop} />}
        {tab==='Brush'      && <BrushTab activeTool={p.activeTool} setActiveTool={p.setActiveTool} brushSize={p.brushSize} setBrushSize={p.setBrushSize} brushStrength={p.brushStrength} setBrushStrength={p.setBrushStrength} />}
      </div>
    </div>
  )
}
