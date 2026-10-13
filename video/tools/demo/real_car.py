# /// script
# requires-python = ">=3.10"
# dependencies = ["opencv-python-headless", "numpy", "pillow"]
# ///
"""Real car photo and video for the camera (S5b) and return (S5c) phone screens.

Inputs (video/demo-raw/, not in git; the plate is readable there):
  toyota.jpg : the "previous photo" (portrait, 3:4)
  toyota.mov : walking from the side up to the same corner of the car
Outputs (remotion/public/real/), the plate blurred everywhere:
  live/f000.jpg … : the video at 30 fps, cropped to the 3:4 viewfinder
  ref.jpg         : the photo warped onto the aligned video frame (the overlay)
  car_wide.jpg    : the photo for the "用車中" card (354 x 330 points, at 2x)
  car_square.jpg  : the photo for the exterior thumbnails
and remotion/src/mock/realCar.ts (frame count, aligned frame, plate, car outline, zoom).

Needs ffmpeg. Run from video/:  uv run tools/demo/real_car.py
"""
import json, subprocess, sys
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parents[2]
RAW = HERE / "demo-raw"
PHOTO, VIDEO = RAW / "toyota.jpg", RAW / "toyota.mov"
PUB = HERE / "remotion" / "public" / "real"
TMP = HERE / "remotion" / "out" / "real_tmp"
CROP_Y = 300          # 3:4 window (1080 x 1440) inside the 1080 x 1920 video
ALIGNED = 81          # frame where the car lines up with the photo (2.7 s)
# plate corners (TL, TR, BR, BL) in the aligned frame and in the photo, traced by hand
PLATE0 = [(262, 1008), (412, 1025), (420, 1100), (256, 1080)]
PHOTO_PLATE = [(435, 1895), (665, 1945), (672, 2070), (430, 2010)]
VF = (558, 744)       # viewfinder at ~1.5x (358 x 477 points)
# How the phone shows the 1080 x 1440 frame: zoom around an origin (fractions).
# "Too far" zooms out to ZOOM_FAR (below 1 the edges are filled with a blurred copy).
ZOOM, ZOOM_FAR, ORIGIN = 1.12, 0.94, (0.55, 0.5)
# car outline in the aligned frame (traced by hand); the right side runs off the frame
OUTLINE = [(548, 342), (600, 325), (760, 316), (915, 312), (985, 318), (1030, 335), (1062, 380), (1090, 450), (1100, 560), (1100, 660),
           (1040, 700), (1004, 760), (1000, 900), (992, 1030), (960, 1072), (900, 1092), (820, 1125), (700, 1150), (560, 1162), (420, 1162),
           (300, 1150), (210, 1130), (160, 1100), (125, 1040), (110, 970), (105, 870), (108, 770), (125, 720), (170, 670), (240, 600),
           (320, 545), (370, 532), (378, 500), (390, 462), (415, 452), (435, 458), (452, 450), (500, 390)]


def grow(q, gx, gy):
    """Enlarge a quad along its own axes (gx, gy: fraction of its width, height)."""
    q = np.float32(q)
    c = q.mean(0)
    u = ((q[1] - q[0]) + (q[2] - q[3])) / 2
    v = ((q[3] - q[0]) + (q[2] - q[1])) / 2
    a, b = u * (1 + gx) / 2, v * (1 + gy) / 2
    return np.float32([c - a - b, c + a - b, c + a + b, c - a + b])


def blur_quad(img, q, gx=0.22, gy=0.45, grid=(7, 3)):
    """A few big blocks, then a heavy blur, inside the (enlarged) plate: no character survives."""
    H, W = img.shape[:2]
    g = grow(q, gx, gy)
    x0, y0 = np.floor(g.min(0)).astype(int)
    x1, y1 = np.ceil(g.max(0)).astype(int)
    x0, y0, x1, y1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return img
    roi = img[y0:y1, x0:x1]
    small = cv2.resize(roi, grid, interpolation=cv2.INTER_AREA)
    pix = cv2.GaussianBlur(cv2.resize(small, (x1 - x0, y1 - y0)), (0, 0), max(4, (x1 - x0) / 10))
    m = np.zeros((y1 - y0, x1 - x0), np.float32)
    cv2.fillConvexPoly(m, np.round(g - [x0, y0]).astype(np.int32), 1)
    m = cv2.GaussianBlur(m, (0, 0), max(2, min(x1 - x0, y1 - y0) / 12))[..., None]
    img[y0:y1, x0:x1] = (pix * m + roi * (1 - m)).astype(np.uint8)
    return img


def track(gray, q0):
    """Follow the plate from the aligned frame with optical flow on the car around it.
    Works when the plate is partly out of the frame (the first frames)."""
    def step(a, b, q):
        x0, y0 = q.min(0)
        x1, y1 = q.max(0)
        m = np.zeros_like(gray[a])
        m[max(0, int(y0 - 220)):int(y1 + 220), max(0, int(x0 - 220)):int(x1 + 220)] = 255
        p = cv2.goodFeaturesToTrack(gray[a], 600, 0.01, 6, mask=m)
        p2, st, _ = cv2.calcOpticalFlowPyrLK(gray[a], gray[b], p, None, winSize=(31, 31), maxLevel=4)
        pb, _, _ = cv2.calcOpticalFlowPyrLK(gray[b], gray[a], p2, None, winSize=(31, 31), maxLevel=4)
        ok = (st.ravel() == 1) & (np.linalg.norm(pb - p, axis=2).ravel() < 1.0)
        H, _ = cv2.findHomography(p[ok], p2[ok], cv2.RANSAC, 3)
        return cv2.perspectiveTransform(q[None], H)[0]
    quads = {ALIGNED: np.float32(q0)}
    for order in (range(ALIGNED + 1, len(gray)), range(ALIGNED - 1, -1, -1)):
        prev = ALIGNED
        for i in order:
            quads[i] = step(prev, i, quads[prev])
            prev = i
    return quads


def smooth_path(P):
    """Closed Catmull-Rom curve through the points, as an SVG path of cubic Beziers."""
    n = len(P)
    d = f"M{P[0][0]} {P[0][1]}"
    for i in range(n):
        p0, p1, p2, p3 = P[i - 1], P[i], P[(i + 1) % n], P[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{c1[0]:.0f} {c1[1]:.0f} {c2[0]:.0f} {c2[1]:.0f} {p2[0]} {p2[1]}"
    return d + " Z"


def main():
    TMP.mkdir(parents=True, exist_ok=True)
    (PUB / "live").mkdir(parents=True, exist_ok=True)
    for f in list(TMP.glob("f*.jpg")) + list((PUB / "live").glob("f*.jpg")):
        f.unlink()
    # video -> cropped frames, plate blurred
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(VIDEO), "-vf", f"fps=30,crop=1080:1440:0:{CROP_Y}",
                    "-q:v", "2", str(TMP / "f%03d.jpg")], check=True)
    frames = [cv2.imread(str(p)) for p in sorted(TMP.glob("f*.jpg"))]
    gray = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in frames]
    quads = track(gray, PLATE0)
    for i, f in enumerate(frames):
        f = blur_quad(f, quads[i])
        cv2.imwrite(str(PUB / "live" / f"f{i:03d}.jpg"), cv2.resize(f, VF, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 84])
    # photo, plate blurred
    photo = cv2.cvtColor(np.asarray(ImageOps.exif_transpose(Image.open(PHOTO)).convert("RGB")), cv2.COLOR_RGB2BGR)
    photo = blur_quad(photo, PHOTO_PLATE, gx=0.18, gy=0.35)
    H, W = photo.shape[:2]
    ph = cv2.resize(photo, (1080, round(H * 1080 / W)))
    # warp the photo onto the aligned frame (SIFT + similarity, car area only)
    sift = cv2.SIFT_create(5000)
    mask = np.zeros(ph.shape[:2], np.uint8)
    mask[int(ph.shape[0] * 0.26):int(ph.shape[0] * 0.8), int(1080 * 0.05):int(1080 * 0.98)] = 255
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(ph, cv2.COLOR_BGR2GRAY), mask)
    k2, d2 = sift.detectAndCompute(gray[ALIGNED], None)
    good = [a for a, b in cv2.BFMatcher().knnMatch(d1, d2, k=2) if a.distance < 0.72 * b.distance]
    p1 = np.float32([k1[a.queryIdx].pt for a in good])
    p2 = np.float32([k2[a.trainIdx].pt for a in good])
    sel = (p2[:, 0] > 100) & (p2[:, 1] > 300) & (p2[:, 1] < 1170)
    M, inl = cv2.estimateAffinePartial2D(p1[sel], p2[sel], method=cv2.RANSAC, ransacReprojThreshold=6)
    ref = cv2.warpAffine(ph, M, (1080, 1440), borderMode=cv2.BORDER_REPLICATE)
    cv2.imwrite(str(PUB / "ref.jpg"), cv2.resize(ref, VF, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 86])
    # return screens: the in-use card (whole car) and a square around the front, at 2x
    ch = round(W * 330 / 354)
    cy = min(H - ch // 2, int(H * 0.605))
    card = photo[cy - ch // 2:cy - ch // 2 + ch, :]
    cv2.imwrite(str(PUB / "car_wide.jpg"), cv2.resize(card, (708, 660), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 86])
    side, sx, sy = int(W * 0.7), int(W * 0.45), int(H * 0.66)
    sq = photo[sy - side // 2:sy + side // 2, sx - side // 2:sx + side // 2]
    cv2.imwrite(str(PUB / "car_square.jpg"), cv2.resize(sq, (184, 184), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 86])
    # remotion/src/mock/realCar.ts
    q = np.int32(PLATE0)
    data = {"frames": len(frames), "fps": 30, "aligned": ALIGNED, "zoom": ZOOM, "zoomFar": ZOOM_FAR, "origin": list(ORIGIN),
            "plate": " ".join(f"{x},{y}" for x, y in PLATE0),
            "plateLabel": [int(q[:, 0].mean()), int(q[:, 1].min())],
            "outline": smooth_path(OUTLINE)}
    ts = HERE / "remotion" / "src" / "mock" / "realCar.ts"
    ts.write_text("// Generated by tools/demo/real_car.py: the real car in the camera and return screens.\n"
                  f"export const REAL_CAR = {json.dumps(data, ensure_ascii=False, indent=2)};\n", encoding="utf-8")
    print(f"{len(frames)} frames, photo matched with {int(inl.sum())}/{int(sel.sum())} points, outline {len(OUTLINE)} points")


if __name__ == "__main__":
    sys.exit(main())
