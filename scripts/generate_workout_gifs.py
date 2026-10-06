"""
Solo Leveling — Full Hunter Kinetic Workout GIF Generator
Generates 16:9 animated GIFs for all standard exercises in the system
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = r"d:\SOLO\public\workouts\gifs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH, HEIGHT = 640, 360  # 16:9 Widescreen
NUM_FRAMES = 24
FPS = 12

# Color Palette (System Theme)
COLOR_BG_START = (8, 10, 22)
COLOR_BG_END = (14, 17, 34)
COLOR_GRID = (25, 33, 60)
COLOR_CYAN = (32, 200, 255)
COLOR_CYAN_DIM = (16, 100, 140)
COLOR_PURPLE = (108, 92, 255)
COLOR_PURPLE_DIM = (50, 42, 120)
COLOR_WHITE = (245, 247, 255)
COLOR_MUTED = (105, 114, 146)
COLOR_SUCCESS = (59, 231, 161)

def get_font(size):
    try:
        return ImageFont.truetype("arialbd.ttf", size)
    except:
        return ImageFont.load_default()

FONT_TITLE = get_font(18)
FONT_SUB = get_font(11)
FONT_TINY = get_font(9)

def draw_background_and_hud(draw, frame_idx, exercise_name, muscle_tag, phase_text):
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(COLOR_BG_START[0] * (1 - ratio) + COLOR_BG_END[0] * ratio)
        g = int(COLOR_BG_START[1] * (1 - ratio) + COLOR_BG_END[1] * ratio)
        b = int(COLOR_BG_START[2] * (1 - ratio) + COLOR_BG_END[2] * ratio)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    horizon = 270
    for x in range(0, WIDTH + 60, 40):
        draw.line([(x, horizon), (x * 1.5 - 160, HEIGHT)], fill=COLOR_GRID, width=1)
    for y in range(horizon, HEIGHT, 18):
        draw.line([(0, y), (WIDTH, y)], fill=COLOR_GRID, width=1)

    scan_y = int(horizon + (frame_idx / NUM_FRAMES) * (HEIGHT - horizon))
    draw.line([(0, scan_y), (WIDTH, scan_y)], fill=(32, 200, 255), width=1)

    # Top HUD Bar
    draw.text((24, 20), "⟨ SYSTEM KINETIC PROTOCOL ⟩", fill=COLOR_CYAN, font=FONT_TINY)
    draw.text((24, 34), exercise_name.upper(), fill=COLOR_WHITE, font=FONT_TITLE)
    draw.text((24, 58), f"TARGET FOCUS: {muscle_tag.upper()}", fill=COLOR_MUTED, font=FONT_SUB)

    # Phase badge
    badge_x = WIDTH - 180
    draw.rectangle([(badge_x, 22), (WIDTH - 24, 46)], fill=(20, 24, 45), outline=COLOR_PURPLE, width=1)
    draw.text((badge_x + 10, 28), phase_text, fill=COLOR_CYAN, font=FONT_TINY)

    draw.text((24, HEIGHT - 36), "BIOMECHANICAL SCAN: OPTIMAL TRAJECTORY", fill=COLOR_MUTED, font=FONT_TINY)
    draw.text((24, HEIGHT - 22), "FPS: 60 · TRACKING: ACTIVE · CADENCE: 2-1-2", fill=COLOR_CYAN_DIM, font=FONT_TINY)
    draw.text((WIDTH - 130, HEIGHT - 22), "SOLO SYSTEM v1.3", fill=COLOR_PURPLE_DIM, font=FONT_TINY)

def draw_glow_circle(draw, center, radius, color):
    x, y = center
    draw.ellipse([(x - radius - 3, y - radius - 3), (x + radius + 3, y + radius + 3)], outline=color, width=1)
    draw.ellipse([(x - radius, y - radius), (x + radius, y + radius)], fill=color)

def draw_limb(draw, p1, p2, width=5, color=COLOR_WHITE):
    draw.line([p1, p2], fill=color, width=width)
    draw_glow_circle(draw, p1, 3, COLOR_CYAN)
    draw_glow_circle(draw, p2, 3, COLOR_CYAN)

# ----------------- ANIMATION BUILDERS -----------------

def create_superman(name="Superman Hold", tag="Back · Strength"):
    frames = []
    floor_y = 230
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        arch = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "ISOMETRIC HOLD" if arch > 0.7 else ("CONCENTRIC LIFT" if math.cos(t * 2 * math.pi) > 0 else "CONTROLLED DESCENT")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(120, floor_y + 4), (520, floor_y + 4)], fill=COLOR_MUTED, width=2)
        pelvis = (320, floor_y)
        chest_y = floor_y - 12 - (arch * 32)
        chest = (240, chest_y)
        head = (195, chest_y - 10)
        shoulder = (235, chest_y - 5)
        elbow = (175, chest_y - 16 - (arch * 18))
        hand = (120, chest_y - 24 - (arch * 24))
        knee = (410, floor_y - 8 - (arch * 22))
        foot = (485, floor_y - 14 - (arch * 34))

        draw.line([chest, pelvis], fill=COLOR_CYAN, width=8)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, elbow, 5, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_WHITE)
        draw_limb(draw, pelvis, knee, 6, COLOR_PURPLE)
        draw_limb(draw, knee, foot, 5, COLOR_WHITE)
        if arch > 0.5:
            draw_glow_circle(draw, (300, int(floor_y - arch * 20)), int(14 * arch), COLOR_CYAN)
        frames.append(img)
    return frames

def create_prone_raises(name, tag, y_style=True):
    frames = []
    floor_y = 230
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        lift = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "PEAK RETRACTION" if lift > 0.7 else ("SCAPULAR LIFT" if math.cos(t * 2 * math.pi) > 0 else "DESCENT")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(120, floor_y + 4), (520, floor_y + 4)], fill=COLOR_MUTED, width=2)
        pelvis = (330, floor_y)
        chest = (250, floor_y - 10)
        head = (205, floor_y - 14)
        shoulder = (245, floor_y - 14)
        elbow = (185, floor_y - 25 - (lift * 35))
        hand = (130 if y_style else 160, floor_y - 38 - (lift * 48))
        knee = (410, floor_y)
        foot = (485, floor_y)

        draw.line([chest, pelvis], fill=COLOR_CYAN, width=8)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, elbow, 5, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_CYAN)
        draw_limb(draw, pelvis, knee, 6, COLOR_PURPLE)
        draw_limb(draw, knee, foot, 5, COLOR_WHITE)
        draw_glow_circle(draw, hand, 5, COLOR_SUCCESS)
        frames.append(img)
    return frames

def create_row_door(name="Towel Rows (Door)", tag="Lats & Grip · Strength"):
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        pull = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "PEAK CONTRACTION" if pull > 0.7 else ("PULL CONCENTRIC" if math.cos(t * 2 * math.pi) > 0 else "ECCENTRIC RETURN")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        door_x = 480
        draw.rectangle([(door_x, 80), (door_x + 14, 280)], fill=(35, 45, 80), outline=COLOR_CYAN, width=2)
        anchor = (door_x, 175)
        foot = (300, 265)
        hip = (260 + int(pull * 45), 220 - int(pull * 10))
        chest = (210 + int(pull * 95), 170 - int(pull * 12))
        head = (chest[0] - 20, chest[1] - 25)
        shoulder = (chest[0] + 10, chest[1])
        elbow = (chest[0] - 15 - int(pull * 20), chest[1] + 10)
        hand = (chest[0] + 35, chest[1] - 5)

        draw.line([hand, anchor], fill=(255, 180, 70), width=3)
        draw.line([chest, hip], fill=COLOR_CYAN, width=8)
        draw_limb(draw, hip, foot, 7, COLOR_PURPLE)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, elbow, 5, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_WHITE)
        if pull > 0.6:
            draw_glow_circle(draw, elbow, 8, COLOR_CYAN)
        frames.append(img)
    return frames

def create_press(name, tag, incline=True):
    frames = []
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        press = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "LOCKOUT" if press > 0.8 else ("DRIVE UPWARD" if math.cos(t * 2 * math.pi) > 0 else "LOWER TEMPO")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(220, 260), (360, 150)], fill=(40, 50, 90), width=6)
        draw.line([(220, 260), (200, 280)], fill=(40, 50, 90), width=6)
        draw.line([(290, 205), (290, 280)], fill=(40, 50, 90), width=4)

        hip = (235, 245)
        chest = (325, 175)
        head = (360, 145)
        shoulder = (320, 170)
        elbow = (int(320 - (1 - press) * 35), int(185 - press * 10))
        hand = (int(310 + press * 25), int(140 - press * 55))

        draw.rectangle([(hand[0] - 14, hand[1] - 6), (hand[0] + 14, hand[1] + 6)], fill=COLOR_CYAN)
        draw.line([(hand[0] - 18, hand[1] - 10), (hand[0] - 18, hand[1] + 10)], fill=COLOR_WHITE, width=4)
        draw.line([(hand[0] + 18, hand[1] - 10), (hand[0] + 18, hand[1] + 10)], fill=COLOR_WHITE, width=4)

        draw.line([hip, chest], fill=COLOR_CYAN, width=8)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, elbow, 5, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_WHITE)
        draw_limb(draw, hip, (260, 240), 6, COLOR_PURPLE)
        draw_limb(draw, (260, 240), (270, 280), 5, COLOR_WHITE)
        frames.append(img)
    return frames

def create_pushup(name="Push-ups", tag="Chest · Triceps · Core"):
    frames = []
    floor_y = 250
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        depth = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "BOTTOM TOUCH" if depth > 0.8 else ("DRIVE UPWARD" if math.cos(t * 2 * math.pi) < 0 else "DESCENT")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(100, floor_y + 2), (540, floor_y + 2)], fill=COLOR_MUTED, width=2)
        hand = (250, floor_y)
        foot = (470, floor_y - 8)
        chest_y = int((floor_y - 65) + depth * 45)
        chest = (255, chest_y)
        head = (205, chest_y - 5)
        hip = (370, int((floor_y - 48) + depth * 32))
        elbow = (275 + int(depth * 15), int((floor_y - 35) + depth * 15))

        draw.line([chest, hip], fill=COLOR_CYAN, width=8)
        draw_limb(draw, hip, foot, 7, COLOR_PURPLE)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, (255, chest_y - 5), elbow, 6, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 5, COLOR_WHITE)
        if depth > 0.7:
            draw_glow_circle(draw, chest, 10, COLOR_SUCCESS)
        frames.append(img)
    return frames

def create_squat(name="Bodyweight Squats", tag="Quads · Hamstrings · Glutes"):
    frames = []
    floor_y = 270
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        squat = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "PARALLEL DEPTH" if squat > 0.8 else ("DRIVE UPWARD" if math.cos(t * 2 * math.pi) < 0 else "CONTROLLED DESCENT")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(180, floor_y + 2), (460, floor_y + 2)], fill=COLOR_MUTED, width=2)
        foot = (310, floor_y)
        hip = (int(300 - squat * 25), int(180 + squat * 55))
        knee = (int(330 + squat * 15), int(225 + squat * 10))
        chest = (int(320 - squat * 10), int(130 + squat * 50))
        head = (chest[0] + 5, chest[1] - 25)
        elbow = (365, chest[1] + 10)
        hand = (410, chest[1])

        draw.line([chest, hip], fill=COLOR_CYAN, width=8)
        draw_limb(draw, hip, knee, 7, COLOR_PURPLE)
        draw_limb(draw, knee, foot, 6, COLOR_WHITE)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, chest, elbow, 5, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_CYAN)
        frames.append(img)
    return frames

def create_plank(name="Plank", tag="Core · Anti-Extension"):
    frames = []
    floor_y = 250
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        pulse = (math.sin(t * 4 * math.pi) * 0.5 + 0.5)
        draw_background_and_hud(draw, f, name, tag, "PHASE: ISOMETRIC HOLD")

        draw.line([(100, floor_y + 2), (540, floor_y + 2)], fill=COLOR_MUTED, width=2)
        elbow = (240, floor_y)
        hand = (210, floor_y)
        foot = (480, floor_y - 6)
        shoulder = (240, floor_y - 45)
        hip = (360, floor_y - 40)
        knee = (420, floor_y - 25)
        head = (195, floor_y - 48)

        draw.line([shoulder, hip], fill=COLOR_CYAN, width=8)
        draw_limb(draw, hip, knee, 7, COLOR_PURPLE)
        draw_limb(draw, knee, foot, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, head, 6, COLOR_WHITE)
        draw_limb(draw, shoulder, elbow, 6, COLOR_PURPLE)
        draw_limb(draw, elbow, hand, 4, COLOR_CYAN)

        # Pulsing core stability circle
        draw_glow_circle(draw, (300, floor_y - 42), int(12 + pulse * 6), COLOR_SUCCESS)
        frames.append(img)
    return frames

def create_crunches(name="Crunches", tag="Abdominals · Hypertrophy"):
    frames = []
    floor_y = 255
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        crunch = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        phase = "PEAK CONTRACTION" if crunch > 0.8 else ("CURL UPWARD" if math.cos(t * 2 * math.pi) > 0 else "EXTEND")
        draw_background_and_hud(draw, f, name, tag, f"PHASE: {phase}")

        draw.line([(100, floor_y + 2), (540, floor_y + 2)], fill=COLOR_MUTED, width=2)
        hip = (320, floor_y - 6)
        knee = (380, floor_y - 50)
        foot = (430, floor_y)

        chest = (250 + int(crunch * 18), floor_y - 12 - int(crunch * 35))
        head = (210 + int(crunch * 22), floor_y - 16 - int(crunch * 45))
        hand = (head[0] + 15, head[1])

        draw.line([hip, chest], fill=COLOR_CYAN, width=8)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, chest, hand, 5, COLOR_PURPLE)
        draw_limb(draw, hip, knee, 7, COLOR_PURPLE)
        draw_limb(draw, knee, foot, 6, COLOR_WHITE)

        if crunch > 0.7:
            draw_glow_circle(draw, (285, floor_y - 25), 10, COLOR_CYAN)
        frames.append(img)
    return frames

def create_jumping_jacks(name="Jumping Jacks", tag="Full Body · Cardio"):
    frames = []
    floor_y = 275
    for f in range(NUM_FRAMES):
        img = Image.new("RGB", (WIDTH, HEIGHT))
        draw = ImageDraw.Draw(img)
        t = f / NUM_FRAMES
        spread = (math.sin(t * 2 * math.pi) * 0.5 + 0.5)
        jump_y = int(spread * 15)

        draw_background_and_hud(draw, f, name, tag, "PHASE: RHYTHMIC CADENCE")
        draw.line([(140, floor_y + 2), (500, floor_y + 2)], fill=COLOR_MUTED, width=2)

        center_x = 320
        hip_y = 195 - jump_y
        hip = (center_x, hip_y)
        chest = (center_x, hip_y - 55)
        head = (center_x, hip_y - 85)

        foot_spread = int(spread * 55)
        foot_l = (center_x - 18 - foot_spread, floor_y - jump_y)
        foot_r = (center_x + 18 + foot_spread, floor_y - jump_y)

        knee_l = (center_x - 10 - int(foot_spread * 0.5), hip_y + 40)
        knee_r = (center_x + 10 + int(foot_spread * 0.5), hip_y + 40)

        # Arms overhead vs at side
        arm_spread = int(spread * 70)
        hand_y = int(chest[1] + 45 - spread * 105)
        hand_l = (center_x - 30 - arm_spread, hand_y)
        hand_r = (center_x + 30 + arm_spread, hand_y)

        draw.line([chest, hip], fill=COLOR_CYAN, width=8)
        draw_limb(draw, chest, head, 6, COLOR_WHITE)
        draw_limb(draw, hip, knee_l, 6, COLOR_PURPLE)
        draw_limb(draw, knee_l, foot_l, 5, COLOR_WHITE)
        draw_limb(draw, hip, knee_r, 6, COLOR_PURPLE)
        draw_limb(draw, knee_r, foot_r, 5, COLOR_WHITE)
        draw_limb(draw, chest, hand_l, 5, COLOR_CYAN)
        draw_limb(draw, chest, hand_r, 5, COLOR_CYAN)

        frames.append(img)
    return frames

ALL_EXERCISES = [
    # Pull Day
    ("superman-hold.gif", lambda: create_superman("Superman Hold", "Back · Erector Spinae & Glutes")),
    ("prone-y-raises.gif", lambda: create_prone_raises("Prone Y-Raises", "Upper Back · Lower Traps", True)),
    ("towel-rows-door.gif", lambda: create_row_door("Towel Rows (Door)", "Lats & Biceps · Back & Grip")),
    ("reverse-snow-angels.gif", lambda: create_prone_raises("Reverse Snow Angels", "Rhomboids · Scapular", False)),
    ("back-extensions-floor.gif", lambda: create_superman("Back Extensions (Floor)", "Lower Back · Strength")),
    ("superman-pulses.gif", lambda: create_superman("Superman Pulses", "Back · Endurance")),
    ("prone-t-raises.gif", lambda: create_prone_raises("Prone T-Raises", "Rear Deltoids · Scapular", False)),
    ("doorframe-rows.gif", lambda: create_row_door("Doorframe Rows", "Back & Grip · Functional")),
    ("single-arm-cable-row.gif", lambda: create_row_door("Single-Arm Cable Row", "Lats · Isolation")),

    # Push Day
    ("incline-dumbbell-press.gif", lambda: create_press("Incline Dumbbell Press", "Chest & Anterior Deltoids", True)),
    ("push-ups.gif", lambda: create_pushup("Push-ups", "Chest · Triceps · Core")),
    ("knee-push-ups.gif", lambda: create_pushup("Knee Push-ups", "Chest · Upper Body Foundation")),
    ("wall-push-ups.gif", lambda: create_pushup("Wall Push-ups", "Chest · Foundation")),
    ("diamond-push-ups.gif", lambda: create_pushup("Diamond Push-ups", "Triceps · Hypertrophy")),
    ("decline-push-ups.gif", lambda: create_pushup("Decline Push-ups", "Upper Chest · Strength")),
    ("explosive-push-ups.gif", lambda: create_pushup("Explosive Push-ups", "Chest · Power")),
    ("pike-hold.gif", lambda: create_pushup("Pike Hold", "Shoulders · Isometric")),

    # Legs
    ("bodyweight-squats.gif", lambda: create_squat("Bodyweight Squats", "Quads · Hamstrings · Glutes")),
    ("jump-squats.gif", lambda: create_squat("Jump Squats", "Legs · Explosive Power")),
    ("lunges.gif", lambda: create_squat("Lunges", "Quads & Glutes · Balance")),
    ("wall-sit.gif", lambda: create_squat("Wall Sit", "Quads · Isometric")),
    ("calf-raises.gif", lambda: create_squat("Calf Raises", "Calves · Plantarflexion")),

    # Core
    ("plank.gif", lambda: create_plank("Plank", "Core · Anti-Extension")),
    ("crunches.gif", lambda: create_crunches("Crunches", "Abdominals · Hypertrophy")),
    ("bicycle-crunches.gif", lambda: create_crunches("Bicycle Crunches", "Obliques · Rotational")),
    ("dead-bug.gif", lambda: create_crunches("Dead Bug", "Core · Motor Control")),
    ("flutter-kicks.gif", lambda: create_crunches("Flutter Kicks", "Lower Abs · Endurance")),
    ("leg-raises.gif", lambda: create_crunches("Leg Raises", "Lower Abs · Strength")),

    # HIIT
    ("jumping-jacks.gif", lambda: create_jumping_jacks("Jumping Jacks", "Full Body · Cardio")),
    ("mountain-climbers.gif", lambda: create_pushup("Mountain Climbers", "Cardio & Core · Speed")),
    ("burpees.gif", lambda: create_jumping_jacks("Burpees", "Full Body · Max Output")),
]

print(f"Generating {len(ALL_EXERCISES)} Solo Leveling animated workout GIFs in {OUTPUT_DIR}...")
for filename, gen in ALL_EXERCISES:
    filepath = os.path.join(OUTPUT_DIR, filename)
    frames = gen()
    frames[0].save(
        filepath,
        save_all=True,
        append_images=frames[1:],
        duration=int(1000 / FPS),
        loop=0,
        optimize=True,
    )
    print(f"  [CREATED] {filename}")

print("\nSUCCESS: All workout animated GIFs generated in public/workouts/gifs/")
