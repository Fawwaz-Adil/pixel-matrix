import numpy as np
from numpy.lib.stride_tricks import as_strided


def pad_image(arr: np.ndarray, pad_h: int, pad_w: int, mode: str = "reflect") -> np.ndarray:
    if arr.ndim == 2:
        return np.pad(arr, ((pad_h, pad_h), (pad_w, pad_w)), mode=mode)
    return np.pad(arr, ((pad_h, pad_h), (pad_w, pad_w), (0, 0)), mode=mode)


def convolve2d(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """
    Vectorized 2D convolution via stride tricks — no scipy, no cv2.

    Uses as_strided to build a (H, W, kH, kW) view of the padded channel,
    then collapses the kernel dimensions with einsum in a single pass.
    """
    kH, kW = kernel.shape
    pad_h, pad_w = kH // 2, kW // 2

    squeeze = image.ndim == 2
    if squeeze:
        image = image[:, :, np.newaxis]

    H, W, C = image.shape
    padded = pad_image(image.astype(np.float64), pad_h, pad_w, mode="reflect")
    output = np.empty((H, W, C), dtype=np.float64)

    for c in range(C):
        ch = padded[:, :, c]  # shape: (H + 2*pad_h, W + 2*pad_w)
        s = ch.strides        # (row_bytes, col_bytes)
        windows = as_strided(
            ch,
            shape=(H, W, kH, kW),
            strides=(s[0], s[1], s[0], s[1]),
        )
        output[:, :, c] = np.einsum("ijkl,kl->ij", windows, kernel, optimize=True)

    return output[:, :, 0] if squeeze else output
