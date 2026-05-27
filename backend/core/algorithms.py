import numpy as np
from .matrix_ops import convolve2d


# ── A. Gaussian Blur ──────────────────────────────────────────────────────────

def _gaussian_kernel(size: int, sigma: float) -> np.ndarray:
    k = size // 2
    ax = np.arange(-k, k + 1, dtype=np.float64)
    xx, yy = np.meshgrid(ax, ax)
    kernel = np.exp(-(xx ** 2 + yy ** 2) / (2.0 * sigma ** 2))
    return kernel / kernel.sum()


def gaussian_blur(image: np.ndarray, kernel_size: int = 5, sigma: float = 1.0) -> np.ndarray:
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = _gaussian_kernel(kernel_size, sigma)
    result = convolve2d(image.astype(np.float64), kernel)
    return np.clip(result, 0, 255).astype(np.uint8)


# ── B. Sobel Edge Detection ───────────────────────────────────────────────────

_Kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float64)
_Ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float64)


def sobel_edges(image: np.ndarray) -> np.ndarray:
    if image.ndim == 3:
        # Luminance-weighted grayscale
        gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2])
    else:
        gray = image.astype(np.float64)

    Gx = convolve2d(gray, _Kx)
    Gy = convolve2d(gray, _Ky)
    G = np.sqrt(Gx ** 2 + Gy ** 2)          # G = sqrt(Gx² + Gy²)
    G = np.clip(G, 0, 255).astype(np.uint8)
    return np.stack([G, G, G], axis=-1)      # return RGB for consistent API shape


# ── C. Color Quantization (Vectorized K-Means) ────────────────────────────────

def kmeans_quantize(image: np.ndarray, k: int, max_iter: int = 20) -> np.ndarray:
    H, W = image.shape[:2]
    pixels = image.reshape(-1, 3).astype(np.float64)  # (N, 3)
    N = pixels.shape[0]

    rng = np.random.default_rng(42)
    centroids = pixels[rng.choice(N, size=k, replace=False)].copy()  # (K, 3)

    labels = np.empty(N, dtype=np.int32)

    for _ in range(max_iter):
        # Batched Euclidean distance to avoid (N, K, 3) blowup on large images
        batch = 4096
        for start in range(0, N, batch):
            end = min(start + batch, N)
            diff = pixels[start:end, np.newaxis, :] - centroids[np.newaxis, :, :]  # (B, K, 3)
            labels[start:end] = np.sqrt((diff ** 2).sum(axis=2)).argmin(axis=1)

        new_centroids = np.empty_like(centroids)
        for j in range(k):
            mask = labels == j
            new_centroids[j] = pixels[mask].mean(axis=0) if mask.any() else centroids[j]

        if np.allclose(centroids, new_centroids, atol=1e-4):
            break
        centroids = new_centroids

    quantized = centroids[labels].reshape(H, W, 3)
    return np.clip(quantized, 0, 255).astype(np.uint8)
