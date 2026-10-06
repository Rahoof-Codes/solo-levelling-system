import os
import cv2
import numpy as np
from PIL import Image

GIF_DIR = r"d:\SOLO\public\workouts\gifs"

# Do not overwrite custom animations created directly from user's uploaded sample
EXCLUDE_LIST = ["superman-hold.gif", "superman-pulses.gif"]

def process_single_gif(filename):
    if filename in EXCLUDE_LIST:
        print(f"Skipping {filename} (custom animated from user sample)")
        return
        
    full_path = os.path.join(GIF_DIR, filename)
    try:
        im = Image.open(full_path)
    except Exception as e:
        print(f"Failed to open {filename}: {e}")
        return

    n_frames = getattr(im, "n_frames", 1)
    duration = im.info.get("duration", 80)
    if duration == 0:
        duration = 80
        
    target_w, target_h = 640, 360
    card_color = np.array([14, 17, 34], dtype=float) # #0E1122
    spotlight_center = np.array([245, 248, 255], dtype=float)
    
    Y, X = np.ogrid[:target_h, :target_w]
    dist_x = (X - 320) / 280.0
    dist_y = (Y - 180) / 130.0
    dist = np.sqrt(dist_x**2 + dist_y**2)
    falloff = np.clip((dist - 0.35) / 0.75, 0.0, 1.0)
    falloff = falloff * falloff * (3 - 2 * falloff)
    studio_bg = (spotlight_center * (1.0 - falloff[:, :, None]) + card_color * falloff[:, :, None])
    
    # Pre-scan frames to find overall bounding box across all frames for stability
    min_y, max_y = 9999, 0
    min_x, max_x = 9999, 0
    
    cached_frames = []
    for i in range(n_frames):
        im.seek(i)
        f_arr = np.array(im.convert("RGB"))
        cached_frames.append(f_arr)
        
        # Check athlete pixels (not background > 235)
        non_bg = ~((f_arr[:, :, 0] > 235) & (f_arr[:, :, 1] > 235) & (f_arr[:, :, 2] > 235))
        if np.any(non_bg):
            y_idx, x_idx = np.where(non_bg)
            min_y = min(min_y, y_idx.min())
            max_y = max(max_y, y_idx.max())
            min_x = min(min_x, x_idx.min())
            max_x = max(max_x, x_idx.max())

    if min_y >= max_y or min_x >= max_x:
        min_y, max_y = 0, cached_frames[0].shape[0] - 1
        min_x, max_x = 0, cached_frames[0].shape[1] - 1
        
    pad = 6
    h_orig, w_orig = cached_frames[0].shape[:2]
    y1 = max(0, min_y - pad)
    y2 = min(h_orig, max_y + pad)
    x1 = max(0, min_x - pad)
    x2 = min(w_orig, max_x + pad)
    
    crop_h = y2 - y1
    crop_w = x2 - x1
    scale = min(240.0 / max(1, crop_h), 460.0 / max(1, crop_w))
    new_w, new_h = max(10, int(crop_w * scale)), max(10, int(crop_h * scale))
    
    start_x = (target_w - new_w) // 2
    start_y = (target_h - new_h) // 2
    
    out_frames = []
    for f_arr in cached_frames:
        # Recolor red to cyan
        is_red = (f_arr[:, :, 0] > 140) & (f_arr[:, :, 0].astype(int) - f_arr[:, :, 1].astype(int) > 35) & (f_arr[:, :, 0].astype(int) - f_arr[:, :, 2].astype(int) > 35)
        recolored = f_arr.copy()
        if np.any(is_red):
            red_intensity = f_arr[is_red, 0].astype(float) / 255.0
            recolored[is_red, 0] = np.clip(30 * (1.0 - red_intensity), 15, 60).astype(np.uint8)
            recolored[is_red, 1] = np.clip(160 + 55 * red_intensity, 160, 225).astype(np.uint8)
            recolored[is_red, 2] = np.clip(210 + 45 * red_intensity, 210, 255).astype(np.uint8)
            
        cropped = recolored[y1:y2, x1:x2]
        resized = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        
        canvas = studio_bg.copy()
        roi = canvas[start_y:start_y+new_h, start_x:start_x+new_w]
        multiplied = (resized.astype(float) / 255.0) * roi
        
        # Preserve cyan/blue glow
        is_blue = (resized[:, :, 2].astype(int) - resized[:, :, 0].astype(int) > 35) & (resized[:, :, 2] > 120)
        multiplied[is_blue] = resized[is_blue]
        
        canvas[start_y:start_y+new_h, start_x:start_x+new_w] = multiplied
        out_frames.append(Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8)))

    tmp_out = full_path + ".tmp.gif"
    out_frames[0].save(
        tmp_out,
        save_all=True,
        append_images=out_frames[1:],
        duration=duration,
        loop=0,
        optimize=True
    )
    im.close()
    os.replace(tmp_out, full_path)
    print(f"Successfully updated {filename} ({new_w}x{new_h} in 640x360 canvas)")

if __name__ == "__main__":
    files = [f for f in os.listdir(GIF_DIR) if f.endswith(".gif")]
    print(f"Found {len(files)} GIFs to enhance...")
    for f in files:
        process_single_gif(f)
    print("All workout GIFs successfully enhanced to 3D anatomical muscle standard!")
