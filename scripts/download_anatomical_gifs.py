"""
Download 3D Anatomical Human Muscle Workout GIFs
Saves directly into d:\SOLO\public\workouts\gifs\
Matches the exact GymVisual / 3D Anatomical Human Muscle style requested by user.
"""

import os
import urllib.request
import time

OUTPUT_DIR = r"d:\SOLO\public\workouts\gifs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

GITHUB_BASE = "https://raw.githubusercontent.com/Johnson-Jia/exercises-dataset/main/"

# Mapping target filenames to sources:
# URLs can be GymVisual direct or GitHub dataset media
SOURCES = {
    # Pull Day (Today's Protocol!)
    "prone-y-raises.gif": "https://gymvisual.com/img/p/2/5/6/4/6/25646.gif",  # EXACT USER SAMPLE
    "superman-hold.gif": "https://gymvisual.com/img/p/5/5/2/7/5527.gif",     # Superman Hold
    "superman-pulses.gif": "https://gymvisual.com/img/p/5/5/2/7/5527.gif",
    "towel-rows-door.gif": GITHUB_BASE + "media/bKWbrTA.gif",                 # One arm towel row
    "single-arm-cable-row.gif": GITHUB_BASE + "media/EIsE3u8.gif",            # Cable one arm row
    "doorframe-rows.gif": GITHUB_BASE + "media/BReCuOn.gif",                  # Squatting row with towel
    "reverse-snow-angels.gif": "https://gymvisual.com/img/p/3/3/3/4/8/33348.gif", # Lying Prone Y / snow angel
    "back-extensions-floor.gif": "https://gymvisual.com/img/p/5/5/2/7/5527.gif",
    "prone-t-raises.gif": "https://gymvisual.com/img/p/2/5/6/4/6/25646.gif",

    # Push Day
    "push-ups.gif": "https://gymvisual.com/img/p/1/0/0/8/3/10083.gif",        # Standard push up
    "incline-dumbbell-press.gif": GITHUB_BASE + "media/ns0SIbU.gif",          # Dumbbell incline bench press
    "knee-push-ups.gif": GITHUB_BASE + "media/ZOuKWir.gif",                   # Kneeling push up
    "wall-push-ups.gif": GITHUB_BASE + "media/LEH9jxP.gif",                   # Wall push up
    "diamond-push-ups.gif": GITHUB_BASE + "media/soIB2rj.gif",                # Diamond push up
    "decline-push-ups.gif": GITHUB_BASE + "media/i5cEhka.gif",                # Decline push up
    "explosive-push-ups.gif": GITHUB_BASE + "media/Snj1wSv.gif",              # Plyo push up
    "archer-push-ups.gif": GITHUB_BASE + "media/A9qxk2F.gif",                 # Archer push up
    "pike-push-ups.gif": "https://gymvisual.com/img/p/1/4/8/1/8/14818.gif",   # Pike push up
    "shoulder-taps-plank.gif": GITHUB_BASE + "media/yRpV5TC.gif",             # Shoulder tap
    "tricep-dips-chair.gif": GITHUB_BASE + "media/RrLske5.gif",               # Bench dip knees bent

    # Legs
    "bodyweight-squats.gif": "https://gymvisual.com/img/p/5/5/7/4/5574.gif",  # Squat
    "jump-squats.gif": GITHUB_BASE + "media/LIlE5Tn.gif",                     # Jump squat
    "lunges.gif": GITHUB_BASE + "media/kMzUs9Y.gif",                          # Forward lunge
    "walking-lunges.gif": GITHUB_BASE + "media/IZVHb27.gif",                  # Walking lunge
    "glute-bridges.gif": GITHUB_BASE + "media/u0cNiij.gif",                   # Low glute bridge
    "calf-raises.gif": GITHUB_BASE + "media/bJYHBIN.gif",                     # Standing calf raise
    "wall-sit.gif": GITHUB_BASE + "media/LIlE5Tn.gif",

    # Core
    "plank.gif": GITHUB_BASE + "media/5VXmnV5.gif",                           # Incline side plank
    "crunches.gif": GITHUB_BASE + "media/TFqbd8t.gif",                        # Crunch floor
    "bicycle-crunches.gif": GITHUB_BASE + "media/tZkGYZ9.gif",                 # Bicycle crunch
    "flutter-kicks.gif": GITHUB_BASE + "media/UVo2Qs2.gif",                   # Flutter kicks
    "dead-bug.gif": GITHUB_BASE + "media/iny3m5y.gif",                        # Dead bug
    "leg-raises.gif": GITHUB_BASE + "media/WhuFnR7.gif",                      # Lying leg raise

    # HIIT
    "jumping-jacks.gif": GITHUB_BASE + "media/HtfCpfi.gif",                   # Star jump male
    "mountain-climbers.gif": GITHUB_BASE + "media/RJgzwny.gif",               # Mountain climber
    "burpees.gif": GITHUB_BASE + "media/dK9394r.gif",                         # Burpee
}

print(f"Downloading {len(SOURCES)} 3D Anatomical Human Muscle GIFs...")
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://gymvisual.com/'
}

success_count = 0
for filename, url in SOURCES.items():
    filepath = os.path.join(OUTPUT_DIR, filename)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            if len(content) > 1000:
                with open(filepath, 'wb') as f:
                    f.write(content)
                print(f"  [DOWNLOADED] {filename} ({len(content):,} bytes) from {url[:45]}...")
                success_count += 1
            else:
                print(f"  [WARNING] File too small for {filename}: {len(content)} bytes")
    except Exception as e:
        print(f"  [ERROR] {filename} ({url}): {e}")
    time.sleep(0.3)

print(f"\nCOMPLETED: {success_count}/{len(SOURCES)} 3D Anatomical Muscle GIFs downloaded into public/workouts/gifs/")
