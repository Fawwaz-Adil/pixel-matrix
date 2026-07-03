// Pure pixel-manipulation functions. No React, no DOM (except ImageData).

export function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

// ── Adjustments ───────────────────────────────────────────────────────────────

export function applyBrightness(d: Uint8ClampedArray, v: number): void {
  const f = v * 2.55
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + f); d[i+1] = clamp(d[i+1] + f); d[i+2] = clamp(d[i+2] + f)
  }
}

export function applyContrast(d: Uint8ClampedArray, v: number): void {
  const f = (259 * (v + 255)) / (255 * (259 - v))
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(f*(d[i]-128)+128); d[i+1] = clamp(f*(d[i+1]-128)+128); d[i+2] = clamp(f*(d[i+2]-128)+128)
  }
}

export function applySaturation(d: Uint8ClampedArray, v: number): void {
  const s = (v + 100) / 100
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.3086*d[i] + 0.6094*d[i+1] + 0.082*d[i+2]
    d[i] = clamp(g + s*(d[i]-g)); d[i+1] = clamp(g + s*(d[i+1]-g)); d[i+2] = clamp(g + s*(d[i+2]-g))
  }
}

// Unsharp mask: sharpen = src + amount*(src - blurred)
export function applySharpness(imgData: ImageData, amount: number): ImageData {
  if (amount <= 0) return imgData
  const { width: W, height: H, data: src } = imgData
  const blur = new Uint8ClampedArray(src.length)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r=0,g=0,b=0,n=0
      for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
        const nx=Math.max(0,Math.min(W-1,x+dx)), ny=Math.max(0,Math.min(H-1,y+dy))
        const i=(ny*W+nx)*4; r+=src[i]; g+=src[i+1]; b+=src[i+2]; n++
      }
      const i=(y*W+x)*4; blur[i]=r/n; blur[i+1]=g/n; blur[i+2]=b/n; blur[i+3]=255
    }
  }
  const f = amount / 50
  const out = new Uint8ClampedArray(src.length)
  for (let i = 0; i < src.length; i += 4) {
    out[i]  =clamp(src[i]  +f*(src[i]  -blur[i]))
    out[i+1]=clamp(src[i+1]+f*(src[i+1]-blur[i+1]))
    out[i+2]=clamp(src[i+2]+f*(src[i+2]-blur[i+2]))
    out[i+3]=src[i+3]
  }
  return new ImageData(out, W, H)
}

export function applyVignette(d: Uint8ClampedArray, W: number, H: number, strength: number): void {
  if (strength <= 0) return
  const cx=W/2, cy=H/2, maxD=Math.sqrt(cx*cx+cy*cy)
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    const f = 1 - strength * ((Math.sqrt((x-cx)**2+(y-cy)**2)/maxD)**2)
    const i=(y*W+x)*4; d[i]=clamp(d[i]*f); d[i+1]=clamp(d[i+1]*f); d[i+2]=clamp(d[i+2]*f)
  }
}

export function applyGrain(d: Uint8ClampedArray, amount: number): void {
  if (amount <= 0) return
  for (let i=0; i<d.length; i+=4) {
    const n=(Math.random()-0.5)*amount*2.55
    d[i]=clamp(d[i]+n); d[i+1]=clamp(d[i+1]+n); d[i+2]=clamp(d[i+2]+n)
  }
}

// ── Color Filters ─────────────────────────────────────────────────────────────

export type ColorFilterName =
  'none'|'red'|'green'|'blue'|'sepia'|'grayscale'|'invert'|
  'cool'|'warm'|'vintage'|'dramatic'|'matte'|'fade'|'cyberpunk'|'noir'

export const COLOR_FILTER_LABELS: Record<ColorFilterName, string> = {
  none:'None', red:'Red', green:'Green', blue:'Blue',
  sepia:'Sepia', grayscale:'B&W', invert:'Invert',
  cool:'Cool', warm:'Warm', vintage:'Vintage', dramatic:'Dramatic',
  matte:'Matte', fade:'Fade', cyberpunk:'Cyber', noir:'Noir',
}

export function applyColorFilter(d: Uint8ClampedArray, filter: ColorFilterName): void {
  if (filter === 'none') return
  for (let i=0; i<d.length; i+=4) {
    let r=d[i], g=d[i+1], b=d[i+2]
    switch (filter) {
      case 'red':      g=clamp(g*.4); b=clamp(b*.4); r=clamp(r*1.2); break
      case 'green':    r=clamp(r*.4); b=clamp(b*.4); g=clamp(g*1.2); break
      case 'blue':     r=clamp(r*.4); g=clamp(g*.4); b=clamp(b*1.2); break
      case 'sepia':  { const nr=clamp(r*.393+g*.769+b*.189),ng=clamp(r*.349+g*.686+b*.168),nb=clamp(r*.272+g*.534+b*.131); r=nr;g=ng;b=nb; break }
      case 'grayscale':{ const l=clamp(.299*r+.587*g+.114*b); r=l;g=l;b=l; break }
      case 'invert':   r=255-r; g=255-g; b=255-b; break
      case 'cool':     r=clamp(r*.82); b=clamp(b*1.2); break
      case 'warm':     r=clamp(r*1.2); g=clamp(g*1.05); b=clamp(b*.8); break
      case 'vintage':{ const sr=clamp(r*.393+g*.769+b*.189),sg=clamp(r*.349+g*.686+b*.168),sb=clamp(r*.272+g*.534+b*.131); r=clamp(sr*.8+40);g=clamp(sg*.8+30);b=clamp(sb*.8+20); break }
      case 'dramatic':{ const lum=.299*r+.587*g+.114*b; r=clamp(1.5*(r-lum)+lum*.7);g=clamp(1.5*(g-lum)+lum*.7);b=clamp(1.5*(b-lum)+lum*.7); break }
      case 'matte':    r=clamp(r*.85+25); g=clamp(g*.85+20); b=clamp(b*.85+20); break
      case 'fade':     r=clamp(r*.7+50); g=clamp(g*.7+50); b=clamp(b*.7+50); break
      case 'cyberpunk':r=clamp(r*1.3); g=clamp(g*.5); b=clamp(b*1.5); break
      case 'noir':   { const nl=clamp(.299*r+.587*g+.114*b),nf=(259*(80+255))/(255*(259-80)),nc=clamp(nf*(nl-128)+128); r=nc;g=nc;b=nc; break }
    }
    d[i]=r; d[i+1]=g; d[i+2]=b
  }
}

// ── Brush Tools ───────────────────────────────────────────────────────────────

export function blurRegion(imgData: ImageData, cx: number, cy: number, brushR: number, blurR: number): void {
  const {width:W,height:H,data} = imgData
  const r=Math.max(1,Math.round(blurR))
  const snap=new Uint8ClampedArray(data)
  for (let y=Math.max(0,cy-brushR|0); y<=Math.min(H-1,(cy+brushR)|0); y++) {
    for (let x=Math.max(0,cx-brushR|0); x<=Math.min(W-1,(cx+brushR)|0); x++) {
      if ((x-cx)**2+(y-cy)**2>brushR**2) continue
      let rv=0,gv=0,bv=0,n=0
      for (let dy=-r;dy<=r;dy++) for (let dx=-r;dx<=r;dx++) {
        const nx=Math.max(0,Math.min(W-1,x+dx)),ny=Math.max(0,Math.min(H-1,y+dy))
        const i=(ny*W+nx)*4; rv+=snap[i];gv+=snap[i+1];bv+=snap[i+2];n++
      }
      const i=(y*W+x)*4; data[i]=rv/n;data[i+1]=gv/n;data[i+2]=bv/n
    }
  }
}

export function pixelateRegion(imgData: ImageData, cx: number, cy: number, brushR: number, bs: number): void {
  const {width:W,height:H,data}=imgData; bs=Math.max(2,bs)
  const x0=Math.max(0,Math.floor((cx-brushR)/bs)*bs),y0=Math.max(0,Math.floor((cy-brushR)/bs)*bs)
  const x1=Math.min(W-1,Math.ceil(cx+brushR)),y1=Math.min(H-1,Math.ceil(cy+brushR))
  for (let by=y0;by<=y1;by+=bs) for (let bx=x0;bx<=x1;bx+=bs) {
    if (((bx+bs/2)-cx)**2+((by+bs/2)-cy)**2>brushR**2) continue
    let rv=0,gv=0,bv=0,n=0
    for (let py=by;py<by+bs&&py<H;py++) for (let px=bx;px<bx+bs&&px<W;px++) {
      const i=(py*W+px)*4; rv+=data[i];gv+=data[i+1];bv+=data[i+2];n++
    }
    if (!n) continue; rv=rv/n|0;gv=gv/n|0;bv=bv/n|0
    for (let py=by;py<by+bs&&py<H;py++) for (let px=bx;px<bx+bs&&px<W;px++) {
      const i=(py*W+px)*4; data[i]=rv;data[i+1]=gv;data[i+2]=bv
    }
  }
}

export function lightenRegion(imgData: ImageData, cx: number, cy: number, brushR: number, amount: number): void {
  const {width:W,height:H,data}=imgData; const f=amount*.5
  for (let y=Math.max(0,cy-brushR|0);y<=Math.min(H-1,(cy+brushR)|0);y++)
    for (let x=Math.max(0,cx-brushR|0);x<=Math.min(W-1,(cx+brushR)|0);x++) {
      if ((x-cx)**2+(y-cy)**2>brushR**2) continue
      const i=(y*W+x)*4; data[i]=clamp(data[i]+f);data[i+1]=clamp(data[i+1]+f);data[i+2]=clamp(data[i+2]+f)
    }
}

export function darkenRegion(imgData: ImageData, cx: number, cy: number, brushR: number, amount: number): void {
  const {width:W,height:H,data}=imgData; const f=1-amount/200
  for (let y=Math.max(0,cy-brushR|0);y<=Math.min(H-1,(cy+brushR)|0);y++)
    for (let x=Math.max(0,cx-brushR|0);x<=Math.min(W-1,(cx+brushR)|0);x++) {
      if ((x-cx)**2+(y-cy)**2>brushR**2) continue
      const i=(y*W+x)*4; data[i]=clamp(data[i]*f);data[i+1]=clamp(data[i+1]*f);data[i+2]=clamp(data[i+2]*f)
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function imageDataFromCanvas(src: HTMLCanvasElement): ImageData {
  const ctx = src.getContext('2d')!
  return ctx.getImageData(0, 0, src.width, src.height)
}

export async function fileToImageData(file: File): Promise<{imgData: ImageData; width: number; height: number}> {
  const url = URL.createObjectURL(file)
  return blobUrlToImageData(url)
}

export function blobUrlToImageData(url: string): Promise<{imgData: ImageData; width: number; height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve({ imgData: ctx.getImageData(0, 0, c.width, c.height), width: c.width, height: c.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode that image — the file may be corrupt or unsupported.'))
    }
    img.src = url
  })
}

export function imageDataToBlob(imgData: ImageData): Promise<Blob> {
  const c = document.createElement('canvas')
  c.width = imgData.width; c.height = imgData.height
  c.getContext('2d')!.putImageData(imgData, 0, 0)
  return new Promise((resolve, reject) =>
    c.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to encode image.'))), 'image/png'),
  )
}

export function scaleImageData(src: ImageData, w: number, h: number): ImageData {
  const from = document.createElement('canvas')
  from.width = src.width; from.height = src.height
  from.getContext('2d')!.putImageData(src, 0, 0)
  const to = document.createElement('canvas')
  to.width = w; to.height = h
  const ctx = to.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(from, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}
