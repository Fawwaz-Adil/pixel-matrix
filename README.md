# Pixel Matrix

A browser-based image editor with client-side adjustments and server-side matrix algorithms.

**Frontend** — Next.js 14 + TypeScript + Tailwind CSS  
**Backend** — Python 3.12 · FastAPI · NumPy (zero OpenCV / scipy)

---

## Features

| Category | What it does |
|---|---|
| **Algorithms** (server) | Gaussian blur, Sobel edge detection, K-Means colour quantisation — all implemented from scratch with NumPy stride tricks |
| **Filters** | 14 instant colour presets (sepia, cyberpunk, noir, …) applied client-side via raw pixel ops |
| **Adjustments** | Brightness, contrast, saturation, sharpness (unsharp mask), blur, vignette, grain |
| **Transform** | Rotate ±90°, flip H/V, resize, percentage crop |
| **Brush tools** | Blur, Mosaic, Dodge, and Burn brushes painted directly on the canvas (works on rotated/flipped views, touch supported) |
| **History** | 25-step undo/redo stack |
| **Compare & reset** | Hold the eye button (or `C`) to peek at the original; one-click reset back to it |

> Server algorithms run on the **current** image (edits preserved) and results are
> restored to the original dimensions — large images are processed at a capped
> resolution server-side for serverless latency, then scaled back client-side.

---

## Project structure

```
pixel-matrix/
├── backend/               # Python serverless function (Vercel)
│   ├── api/
│   │   └── index.py       # FastAPI app — entry point for Vercel
│   ├── core/
│   │   ├── algorithms.py  # Gaussian · Sobel · K-Means
│   │   └── matrix_ops.py  # Vectorised convolution via stride tricks
│   ├── requirements.txt
│   └── vercel.json
│
└── frontend/              # Next.js app (Vercel)
    ├── app/               # App Router pages
    ├── components/        # ImageCanvas · ControlPanel
    ├── hooks/             # useImageEditor state machine
    ├── lib/
    │   ├── api.ts         # Calls the FastAPI backend
    │   └── imageOps.ts    # Client-side pixel operations
    └── .env.local.example
```

---

## Local development

### 1 — Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python api/index.py          # serves on http://localhost:8000
```

### 2 — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # default already points to localhost:8000
npm run dev                          # http://localhost:3000
```

---

## Deploying to Vercel

The backend and frontend are deployed as **two separate Vercel projects** — both from the same repository.

### Step 1 — Deploy the backend

1. Push this repo to GitHub.
2. In the Vercel dashboard → **Add New Project** → import the repo.
3. Set **Root Directory** to `backend`.
4. Vercel auto-detects Python from `requirements.txt`.
5. Deploy → note the URL, e.g. `https://pixel-matrix-api.vercel.app`.

### Step 2 — Deploy the frontend

1. **Add New Project** again → same repo.
2. Set **Root Directory** to `frontend`.
3. Add an **Environment Variable**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://pixel-matrix-api.vercel.app` (your backend URL, no trailing slash) |

4. Deploy.

> **Hobby plan note**: serverless functions time out at 10 s by default.  
> `backend/vercel.json` requests 30 s (`maxDuration: 30`), which requires the **Pro** plan.  
> On the Hobby plan, lower the K-Means palette size or keep images small (≤ 256 px — already capped in code).

---

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | `http://localhost:8000` | URL of the FastAPI backend |

---

## License

MIT
