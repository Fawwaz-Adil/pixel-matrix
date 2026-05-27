import io
import os
import sys

# Allow importing core/ whether running locally (uvicorn) or as a Vercel function
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from core.algorithms import gaussian_blur, kmeans_quantize, sobel_edges

app = FastAPI(title="Pixel Matrix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_DIM = 512  # cap image size to keep serverless latency reasonable


def _load(file: UploadFile, max_dim: int = MAX_DIM) -> np.ndarray:
    img = Image.open(file.file).convert("RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    return np.array(img)


def _png_response(arr: np.ndarray) -> Response:
    buf = io.BytesIO()
    Image.fromarray(arr.astype(np.uint8)).save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.post("/api/gaussian")
async def apply_gaussian(
    image: UploadFile = File(...),
    kernel_size: int = Form(5),
    sigma: float = Form(1.0),
):
    arr = _load(image)
    return _png_response(gaussian_blur(arr, kernel_size=kernel_size, sigma=sigma))


@app.post("/api/sobel")
async def apply_sobel(image: UploadFile = File(...)):
    arr = _load(image)
    return _png_response(sobel_edges(arr))


@app.post("/api/kmeans")
async def apply_kmeans(
    image: UploadFile = File(...),
    k: int = Form(8),
):
    arr = _load(image, max_dim=256)  # smaller cap — K-Means is O(N·K) per iter
    return _png_response(kmeans_quantize(arr, k=k))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)
