// ============================================================
// Workout GIFs, Muscle Tags, and Form Cues Directory
// ============================================================

export interface ExerciseMetadata {
  slug: string;
  muscleTag: string;
  formCue: string;
  defaultLoad: string;
  gifPath: string;
  gifSource: any;
}

export const EXERCISE_METADATA_MAP: Record<string, Partial<ExerciseMetadata>> = {
  // --- Push Exercises ---
  'Incline dumbbell press': {
    muscleTag: 'Chest · Strength',
    formCue: 'Controlled descent · drive through the chest',
    defaultLoad: '22.5 kg',
  },
  'Wall Push-ups': {
    muscleTag: 'Chest · Foundation',
    formCue: 'Hands shoulder-width · press firmly away from wall',
    defaultLoad: 'BW',
  },
  'Knee Push-ups': {
    muscleTag: 'Chest · Strength',
    formCue: 'Straight line from knees to crown · full lockout',
    defaultLoad: 'BW',
  },
  'Shoulder Taps (Plank)': {
    muscleTag: 'Shoulders · Stability',
    formCue: 'Tap opposite shoulder without tilting hips',
    defaultLoad: 'BW',
  },
  'Tricep Dips (Chair)': {
    muscleTag: 'Triceps · Strength',
    formCue: 'Lower to 90 degrees at elbows · press up through palms',
    defaultLoad: 'BW',
  },
  'Pike Hold': {
    muscleTag: 'Shoulders · Isometric',
    formCue: 'Hips elevated in high V-shape · lock shoulder girdle',
    defaultLoad: 'BW',
  },
  'Push-ups': {
    muscleTag: 'Chest · Power',
    formCue: 'Chest to deck · explosive drive to top',
    defaultLoad: 'BW',
  },
  'Diamond Push-ups': {
    muscleTag: 'Triceps · Hypertrophy',
    formCue: 'Index fingers and thumbs touching · elbows tucked tight',
    defaultLoad: 'BW',
  },
  'Pike Push-ups': {
    muscleTag: 'Shoulders · Strength',
    formCue: 'Crown of head descends to ground · push up and back',
    defaultLoad: 'BW',
  },
  'Decline Push-ups': {
    muscleTag: 'Upper Chest · Strength',
    formCue: 'Feet on chair or bench · controlled tempo',
    defaultLoad: 'BW',
  },
  'Explosive Push-ups': {
    muscleTag: 'Chest · Explosive',
    formCue: 'Drive upward with maximum force · hands leave floor',
    defaultLoad: 'BW',
  },
  'Archer Push-ups': {
    muscleTag: 'Chest & Arms · Elite',
    formCue: 'Slide one arm out straight · press with working arm',
    defaultLoad: 'BW',
  },
  'Handstand Push-up Negatives': {
    muscleTag: 'Shoulders · Advanced',
    formCue: 'Slow 5-second descent against wall · braced core',
    defaultLoad: 'BW',
  },
  'Pseudo Planche Push-ups': {
    muscleTag: 'Anterior Deltoids · Strength',
    formCue: 'Lean torso forward ahead of hands · protract scapula',
    defaultLoad: 'BW',
  },
  'Hindu Push-ups': {
    muscleTag: 'Upper Body · Mobility',
    formCue: 'Swoop chest low through hands into upward dog arch',
    defaultLoad: 'BW',
  },
  'Tricep Diamond Push-ups (Elevated)': {
    muscleTag: 'Triceps · Elite',
    formCue: 'Elevated feet with diamond hand position',
    defaultLoad: 'BW',
  },

  // --- Pull Exercises ---
  'Superman Hold': {
    muscleTag: 'Back · Strength',
    formCue: 'Squeeze glutes & lower back · arms and thighs elevated',
    defaultLoad: 'BW',
  },
  'Prone Y-Raises': {
    muscleTag: 'Upper Back · Scapular',
    formCue: 'Thumbs pointing up · retract and depress shoulder blades',
    defaultLoad: 'BW',
  },
  'Towel Rows (Door)': {
    muscleTag: 'Lats & Grip · Strength',
    formCue: 'Elbows tight to ribs · pull chest toward door anchor',
    defaultLoad: 'BW',
  },
  'Reverse Snow Angels': {
    muscleTag: 'Rhomboids · Endurance',
    formCue: 'Wide arc from hips to overhead · arms off floor',
    defaultLoad: 'BW',
  },
  'Back Extensions (Floor)': {
    muscleTag: 'Erectors · Strength',
    formCue: 'Lift chest smoothly · brief isometric hold at peak',
    defaultLoad: 'BW',
  },
  'Superman Pulses': {
    muscleTag: 'Back · Endurance',
    formCue: 'Pulsing contraction at apex of hold · steady breathing',
    defaultLoad: 'BW',
  },
  'Prone T-Raises': {
    muscleTag: 'Rear Delts · Strength',
    formCue: 'Arms straight out at 90° · pinch shoulder blades',
    defaultLoad: 'BW',
  },
  'Inverted Rows (Table)': {
    muscleTag: 'Lats & Rhomboids · Strength',
    formCue: 'Under table · pull sternum to tabletop with straight body',
    defaultLoad: 'BW',
  },
  'Doorframe Rows': {
    muscleTag: 'Back · Strength',
    formCue: 'Firm grip on doorframe · lean back and pull chest forward',
    defaultLoad: 'BW',
  },
  'Towel Bicep Curls (Isometric)': {
    muscleTag: 'Biceps · Tension',
    formCue: 'Stomp towel loop · maximal bicep flex against tension',
    defaultLoad: 'BW',
  },
  'Bodyweight Rear Delt Flyes': {
    muscleTag: 'Rear Delts · Isolation',
    formCue: 'Hinge hips 45° · sweep arms wide with slight elbow bend',
    defaultLoad: 'BW',
  },
  'Superman Hold (Weighted)': {
    muscleTag: 'Back Chain · Strength',
    formCue: 'Hold light resistance · keep head aligned with spine',
    defaultLoad: 'BW',
  },
  'Doorframe Pull-up Holds': {
    muscleTag: 'Lats & Grip · Isometric',
    formCue: 'Isometric hold at 90 degree elbow flex · elbows in',
    defaultLoad: 'BW',
  },
  'Commando Rows (Floor)': {
    muscleTag: 'Back & Core · Anti-Rotation',
    formCue: 'Plank posture · pull elbow past ribs without twisting hips',
    defaultLoad: 'BW',
  },
  'Single-arm cable row': {
    muscleTag: 'Lats · Isolation',
    formCue: 'Controlled pull · drive elbow down and back',
    defaultLoad: '18 kg',
  },

  // --- Leg Exercises ---
  'Bodyweight Squats': {
    muscleTag: 'Legs · Strength',
    formCue: 'Hips back and down · knees track outward over toes',
    defaultLoad: 'BW',
  },
  'Lunges': {
    muscleTag: 'Quads & Glutes · Unilateral',
    formCue: '90 degree angles on both knees · torso tall and upright',
    defaultLoad: 'BW',
  },
  'Glute Bridges': {
    muscleTag: 'Glutes · Activation',
    formCue: 'Drive through heels · full hip extension with glute squeeze',
    defaultLoad: 'BW',
  },
  'Wall Sit': {
    muscleTag: 'Quads · Isometric',
    formCue: 'Thighs parallel to floor · press lower back into wall',
    defaultLoad: 'BW',
  },
  'Calf Raises': {
    muscleTag: 'Calves · Endurance',
    formCue: 'High rise onto balls of feet · 1-second pause at top',
    defaultLoad: 'BW',
  },
  'Jump Squats': {
    muscleTag: 'Legs · Explosive Power',
    formCue: 'Explode straight up · land softly into next repetition',
    defaultLoad: 'BW',
  },
  'Bulgarian Split Squats (Chair)': {
    muscleTag: 'Quads & Glutes · Hypertrophy',
    formCue: 'Back foot elevated · drop back knee straight down',
    defaultLoad: 'BW',
  },
  'Single-Leg Glute Bridges': {
    muscleTag: 'Glutes & Hamstrings · Strength',
    formCue: 'One leg extended forward · bridge up through single heel',
    defaultLoad: 'BW',
  },
  'Walking Lunges': {
    muscleTag: 'Legs · Functional',
    formCue: 'Continuous forward strides · maintain steady rhythm',
    defaultLoad: 'BW',
  },
  'Calf Raises (Single Leg)': {
    muscleTag: 'Calves · Strength',
    formCue: 'Full ankle dorsiflexion into plantarflexion',
    defaultLoad: 'BW',
  },
  'Pistol Squat Progressions': {
    muscleTag: 'Legs · Mobility & Balance',
    formCue: 'Balance on one leg · free leg extended forward',
    defaultLoad: 'BW',
  },
  'Jump Lunges': {
    muscleTag: 'Legs · Anaerobic Power',
    formCue: 'Switch stance mid-air · soft deceleration on landing',
    defaultLoad: 'BW',
  },
  'Shrimp Squats': {
    muscleTag: 'Quads · Elite Strength',
    formCue: 'Hold rear ankle · touch trailing knee gently to floor',
    defaultLoad: 'BW',
  },
  'Nordic Curl Negatives': {
    muscleTag: 'Hamstrings · Eccentric',
    formCue: 'Ankles anchored · slow descent resisting with hamstrings',
    defaultLoad: 'BW',
  },
  'Explosive Box Step-ups (Chair)': {
    muscleTag: 'Legs · Explosive',
    formCue: 'Drive lead heel into step · propel upward into knee drive',
    defaultLoad: 'BW',
  },

  // --- Core Exercises ---
  'Crunches': {
    muscleTag: 'Abdominals · Hypertrophy',
    formCue: 'Curl ribcage down toward pelvis · exhale on crunch',
    defaultLoad: 'BW',
  },
  'Plank': {
    muscleTag: 'Core · Anti-Extension',
    formCue: 'Elbows under shoulders · glutes and abs locked tight',
    defaultLoad: 'BW',
  },
  'Bicycle Crunches': {
    muscleTag: 'Obliques · Dynamic',
    formCue: 'Rotate shoulder to opposite knee · full extension on off leg',
    defaultLoad: 'BW',
  },
  'Dead Bug': {
    muscleTag: 'Core · Stability',
    formCue: 'Lower opposite limbs slowly · keep lumbar pressed into floor',
    defaultLoad: 'BW',
  },
  'Flutter Kicks': {
    muscleTag: 'Lower Abs · Endurance',
    formCue: 'Small alternating kicks 6 inches off ground · ribs down',
    defaultLoad: 'BW',
  },
  'Leg Raises': {
    muscleTag: 'Lower Abs · Strength',
    formCue: 'Raise legs to 90 degrees without arching lower back',
    defaultLoad: 'BW',
  },
  'Side Plank': {
    muscleTag: 'Obliques · Stability',
    formCue: 'Lift hips until spine is completely neutral and straight',
    defaultLoad: 'BW',
  },
  'Russian Twists': {
    muscleTag: 'Obliques · Rotational',
    formCue: 'Lean back 45 degrees · rotate shoulders side to side',
    defaultLoad: 'BW',
  },
  'V-ups': {
    muscleTag: 'Full Core · Power',
    formCue: 'Simultaneous jackknife folding legs and torso to meet in V',
    defaultLoad: 'BW',
  },
  'Hanging Knee Raises (Doorframe)': {
    muscleTag: 'Core & Hip Flexors · Strength',
    formCue: 'Pull knees to chest without swinging body',
    defaultLoad: 'BW',
  },
  'Dragon Flags (Negative)': {
    muscleTag: 'Core · Master Class',
    formCue: 'Lower straight body slowly from shoulder stand',
    defaultLoad: 'BW',
  },
  'Ab Wheel Rollouts': {
    muscleTag: 'Core · Anti-Extension',
    formCue: 'Extend forward with control · pull back with abs and lats',
    defaultLoad: 'BW',
  },
  'L-Sit Hold': {
    muscleTag: 'Core & Triceps · Isometric',
    formCue: 'Lock triceps · compress abs to keep straight legs elevated',
    defaultLoad: 'BW',
  },
  'Plank (Weighted)': {
    muscleTag: 'Core · High Load',
    formCue: 'Maintain level pelvis with added resistance on mid-back',
    defaultLoad: 'BW',
  },
  'Windshield Wipers': {
    muscleTag: 'Obliques · Rotational Control',
    formCue: 'Lower straight legs side to side in controlled windshield arc',
    defaultLoad: 'BW',
  },

  // --- HIIT & Cardio ---
  'Jumping Jacks': {
    muscleTag: 'Full Body · Warm-up',
    formCue: 'Light on toes · rhythmic arm raises overhead',
    defaultLoad: 'BW',
  },
  'High Knees': {
    muscleTag: 'Cardio · Cadence',
    formCue: 'Drive knees up past waist line · fast ground contact',
    defaultLoad: 'BW',
  },
  'Mountain Climbers': {
    muscleTag: 'Cardio & Core · Speed',
    formCue: 'High plank cadence · drive knees alternately toward chest',
    defaultLoad: 'BW',
  },
  'Squat Jumps': {
    muscleTag: 'Legs · Conditioning',
    formCue: 'Continuous fluid rhythm from squat to explosive jump',
    defaultLoad: 'BW',
  },
  'Butt Kicks': {
    muscleTag: 'Hamstrings · Cadence',
    formCue: 'Heels snap rapidly toward glutes under hips',
    defaultLoad: 'BW',
  },
  'Burpees': {
    muscleTag: 'Full Body · Max Output',
    formCue: 'Chest hits floor · snap feet in · vertical leap with clap',
    defaultLoad: 'BW',
  },
  'Tuck Jumps': {
    muscleTag: 'Legs · Reactive Power',
    formCue: 'Explosive vertical jump · tuck knees tightly to chest',
    defaultLoad: 'BW',
  },
  'Skater Jumps': {
    muscleTag: 'Lateral Agility · Balance',
    formCue: 'Bound laterally · absorb momentum on single leg landing',
    defaultLoad: 'BW',
  },
  'High Knees Sprint': {
    muscleTag: 'Cardio · Max Sprint',
    formCue: '100% effort velocity · pump arms synchronously',
    defaultLoad: 'BW',
  },
  'Lateral Shuffles': {
    muscleTag: 'Agility · Footwork',
    formCue: 'Athletic stance · quick lateral steps without crossing feet',
    defaultLoad: 'BW',
  },
  'Burpee Broad Jumps': {
    muscleTag: 'Full Body · Horizontal Power',
    formCue: 'Burpee into explosive two-footed forward long jump',
    defaultLoad: 'BW',
  },
  'Switch Lunges': {
    muscleTag: 'Legs · Fast Twitch',
    formCue: 'Scissor jump between lunges with upright chest',
    defaultLoad: 'BW',
  },
  'Speed Skaters': {
    muscleTag: 'Lateral Power · Endurance',
    formCue: 'Low sweeping lateral strides simulating ice speed skating',
    defaultLoad: 'BW',
  },
  'Sprint in Place': {
    muscleTag: 'Cardio · Anaerobic',
    formCue: 'Highest frequency foot strike · pump elbows back',
    defaultLoad: 'BW',
  },
  'Star Jumps': {
    muscleTag: 'Full Body · Plyometric',
    formCue: 'Crouch low · burst up into mid-air wide star position',
    defaultLoad: 'BW',
  },
  'Plank to Push-up': {
    muscleTag: 'Core & Upper · Dynamic',
    formCue: 'Forearm to palm transitions · prevent hip swaying',
    defaultLoad: 'BW',
  },
  'Burpee Tuck Jumps': {
    muscleTag: 'Full Body · Elite Cardio',
    formCue: 'Standard burpee finishing with full knee-tuck in air',
    defaultLoad: 'BW',
  },

  // --- Recovery ---
  'Light Walk': {
    muscleTag: 'Recovery · Parasympathetic',
    formCue: 'Easy relaxed stroll · deep diaphragmatic breathing',
    defaultLoad: 'BW',
  },
  'Full-Body Stretch': {
    muscleTag: 'Mobility · Recovery',
    formCue: 'Gentle holds for major muscle groups · never force into pain',
    defaultLoad: 'BW',
  },
  'Deep Breathing': {
    muscleTag: 'Nervous System · Calm',
    formCue: 'Box breathing: 4s inhale · 4s hold · 4s exhale · 4s hold',
    defaultLoad: 'BW',
  },
  'Foam Roll / Self-Massage': {
    muscleTag: 'Fascia · Restoration',
    formCue: 'Slow sweeps over tight muscles · pause on tender trigger points',
    defaultLoad: 'BW',
  },
};

/**
 * Static map of all bundled exercise GIFs for offline & native mobile playback
 */
export const WORKOUT_GIF_MAP: Record<string, any> = {
  'archer-push-ups': require('@/assets/workouts/gifs/archer-push-ups.gif'),
  'back-extensions-floor': require('@/assets/workouts/gifs/back-extensions-floor.gif'),
  'bicycle-crunches': require('@/assets/workouts/gifs/bicycle-crunches.gif'),
  'bodyweight-squats': require('@/assets/workouts/gifs/bodyweight-squats.gif'),
  'burpees': require('@/assets/workouts/gifs/burpees.gif'),
  'calf-raises': require('@/assets/workouts/gifs/calf-raises.gif'),
  'crunches': require('@/assets/workouts/gifs/crunches.gif'),
  'dead-bug': require('@/assets/workouts/gifs/dead-bug.gif'),
  'decline-push-ups': require('@/assets/workouts/gifs/decline-push-ups.gif'),
  'diamond-push-ups': require('@/assets/workouts/gifs/diamond-push-ups.gif'),
  'doorframe-rows': require('@/assets/workouts/gifs/doorframe-rows.gif'),
  'explosive-push-ups': require('@/assets/workouts/gifs/explosive-push-ups.gif'),
  'flutter-kicks': require('@/assets/workouts/gifs/flutter-kicks.gif'),
  'glute-bridges': require('@/assets/workouts/gifs/glute-bridges.gif'),
  'incline-dumbbell-press': require('@/assets/workouts/gifs/incline-dumbbell-press.gif'),
  'jump-squats': require('@/assets/workouts/gifs/jump-squats.gif'),
  'jumping-jacks': require('@/assets/workouts/gifs/jumping-jacks.gif'),
  'knee-push-ups': require('@/assets/workouts/gifs/knee-push-ups.gif'),
  'leg-raises': require('@/assets/workouts/gifs/leg-raises.gif'),
  'lunges': require('@/assets/workouts/gifs/lunges.gif'),
  'mountain-climbers': require('@/assets/workouts/gifs/mountain-climbers.gif'),
  'pike-hold': require('@/assets/workouts/gifs/pike-hold.gif'),
  'pike-push-ups': require('@/assets/workouts/gifs/pike-push-ups.gif'),
  'plank': require('@/assets/workouts/gifs/plank.gif'),
  'prone-t-raises': require('@/assets/workouts/gifs/prone-t-raises.gif'),
  'prone-y-raises': require('@/assets/workouts/gifs/prone-y-raises.gif'),
  'push-ups': require('@/assets/workouts/gifs/push-ups.gif'),
  'reverse-snow-angels': require('@/assets/workouts/gifs/reverse-snow-angels.gif'),
  'shoulder-taps-plank': require('@/assets/workouts/gifs/shoulder-taps-plank.gif'),
  'single-arm-cable-row': require('@/assets/workouts/gifs/single-arm-cable-row.gif'),
  'superman-hold': require('@/assets/workouts/gifs/superman-hold.gif'),
  'superman-pulses': require('@/assets/workouts/gifs/superman-pulses.gif'),
  'towel-rows-door': require('@/assets/workouts/gifs/towel-rows-door.gif'),
  'tricep-dips-chair': require('@/assets/workouts/gifs/tricep-dips-chair.gif'),
  'walking-lunges': require('@/assets/workouts/gifs/walking-lunges.gif'),
  'wall-push-ups': require('@/assets/workouts/gifs/wall-push-ups.gif'),
  'wall-sit': require('@/assets/workouts/gifs/wall-sit.gif'),
};

export const FALLBACK_EXERCISE_IMAGE = require('@/assets/images/exercise-demo.png');

/**
 * Convert exercise name to file slug (e.g. 'Superman Hold' -> 'superman-hold')
 */
export function exerciseToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve bundled gif asset for an exercise with robust alias matching
 */
export function getExerciseGifSource(nameOrSlug: string): any {
  if (!nameOrSlug) return FALLBACK_EXERCISE_IMAGE;
  const slug = exerciseToSlug(nameOrSlug);
  if (WORKOUT_GIF_MAP[slug]) return WORKOUT_GIF_MAP[slug];

  // Common aliases & partials
  if (slug.includes('pushup') || slug.includes('push-up')) return WORKOUT_GIF_MAP['push-ups'];
  if (slug.includes('squat')) return WORKOUT_GIF_MAP['bodyweight-squats'];
  if (slug.includes('lunge')) return WORKOUT_GIF_MAP['lunges'] || WORKOUT_GIF_MAP['walking-lunges'];
  if (slug.includes('plank')) return WORKOUT_GIF_MAP['plank'];
  if (slug.includes('crunch')) return WORKOUT_GIF_MAP['crunches'];
  if (slug.includes('burpee')) return WORKOUT_GIF_MAP['burpees'];
  if (slug.includes('jack')) return WORKOUT_GIF_MAP['jumping-jacks'];
  if (slug.includes('climber')) return WORKOUT_GIF_MAP['mountain-climbers'];
  if (slug.includes('superman')) return WORKOUT_GIF_MAP['superman-hold'];
  if (slug.includes('row')) return WORKOUT_GIF_MAP['doorframe-rows'] || WORKOUT_GIF_MAP['towel-rows-door'];
  if (slug.includes('dip')) return WORKOUT_GIF_MAP['tricep-dips-chair'];
  if (slug.includes('raise')) return WORKOUT_GIF_MAP['leg-raises'] || WORKOUT_GIF_MAP['prone-y-raises'];
  if (slug.includes('bridge')) return WORKOUT_GIF_MAP['glute-bridges'];
  if (slug.includes('extension')) return WORKOUT_GIF_MAP['back-extensions-floor'];

  const match = Object.keys(WORKOUT_GIF_MAP).find((k) => slug.includes(k) || k.includes(slug));
  if (match) return WORKOUT_GIF_MAP[match];

  return FALLBACK_EXERCISE_IMAGE;
}

/**
 * Return comprehensive metadata for an exercise
 */
export function getExerciseMetadata(name: string): ExerciseMetadata {
  const meta = EXERCISE_METADATA_MAP[name];
  const slug = exerciseToSlug(name);
  const gifSource = getExerciseGifSource(name);

  return {
    slug,
    muscleTag: meta?.muscleTag ?? 'Strength · Core',
    formCue: meta?.formCue ?? 'Maintain steady rhythm and correct posture',
    defaultLoad: meta?.defaultLoad ?? 'BW',
    gifPath: `/workouts/gifs/${slug}.gif`,
    gifSource,
  };
}
