/**
 * Form-guide data for every seed exercise.
 *
 * Photos are real start/end-position demonstrations from free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, Unlicense / public domain),
 * downloaded into public/exercises/<exerciseId>/{0,1}.jpg so the PWA keeps
 * working fully offline. The player crossfades the two positions like a GIF
 * while the numbered steps highlight in sync.
 */

export interface DemoStep {
  text: string;
  /** Which photo this step belongs to: 0 = start, 1 = end. */
  phase: 0 | 1;
}

export interface ExerciseDemoData {
  /** free-exercise-db id the photos come from. */
  source: string;
  steps: DemoStep[];
  /** Shown when the photo equipment differs from the program's. */
  note?: string;
  /** Source photo is portrait (2:3) instead of landscape (3:2). */
  portrait?: boolean;
  /** Search terms for the external video link. */
  videoQuery: string;
}

export function demoImages(exerciseId: string): [string, string] {
  const base = `${import.meta.env.BASE_URL}exercises/${exerciseId}`;
  return [`${base}/0.jpg`, `${base}/1.jpg`];
}

export function demoVideoUrl(demo: ExerciseDemoData): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(demo.videoQuery)}`;
}

export const DEMOS: Record<string, ExerciseDemoData> = {
  'bulgarian-split-squat': {
    source: 'Split_Squat_with_Dumbbells',
    portrait: true,
    videoQuery: 'dumbbell bulgarian split squat proper form',
    steps: [
      { phase: 0, text: 'Rest the top of your rear foot on a flat bench and step the front foot well forward.' },
      { phase: 0, text: 'Hold a dumbbell in each hand at your sides, standing tall with a slight forward lean.' },
      { phase: 1, text: 'Bend the front knee and lower the back knee toward the floor, front knee tracking over the toes.' },
      { phase: 1, text: 'Descend until the front thigh is near parallel — the rear leg stays relaxed.' },
      { phase: 0, text: 'Drive through the front heel to stand back up. Finish all reps, then switch legs.' },
    ],
  },

  'incline-db-press': {
    source: 'Incline_Dumbbell_Press',
    videoQuery: 'incline dumbbell press proper form 30 degrees',
    steps: [
      { phase: 0, text: 'Set the bench to 30° and lie back with dumbbells at the upper chest, elbows about 45° from the torso.' },
      { phase: 0, text: 'Feet planted, shoulder blades pinned to the pad.' },
      { phase: 1, text: 'Press up and slightly back over the upper chest until the arms are nearly straight.' },
      { phase: 0, text: 'Lower over 2 seconds to the chest. Same bench and dumbbells as the row — zero setup change.' },
    ],
  },

  'chest-supported-db-row': {
    source: 'Dumbbell_Incline_Row',
    videoQuery: 'chest supported dumbbell row incline bench form',
    steps: [
      { phase: 0, text: 'Set the bench to 30° and lie face-down with your chest on the pad, dumbbells hanging under the shoulders.' },
      { phase: 1, text: 'Row both dumbbells toward your hips, driving the elbows past the torso.' },
      { phase: 1, text: 'Squeeze the shoulder blades at the top — the pad stops you cheating.' },
      { phase: 0, text: 'Lower to a full stretch with straight arms before the next rep.' },
    ],
  },

  'standing-bb-curl': {
    source: 'Barbell_Curl',
    videoQuery: 'standing barbell bicep curl proper form',
    steps: [
      { phase: 0, text: 'Hold the 15 kg bar with an underhand grip at thigh level, elbows pinned to the ribs.' },
      { phase: 1, text: 'Curl the bar up without swinging the torso or letting the elbows drift forward.' },
      { phase: 1, text: 'Squeeze the biceps hard for one second at the top.' },
      { phase: 0, text: 'Lower under control to fully straight arms.' },
    ],
  },

  'overhead-db-tricep-extension': {
    source: 'Standing_Dumbbell_Triceps_Extension',
    videoQuery: 'standing overhead dumbbell triceps extension two hands form',
    steps: [
      { phase: 0, text: 'Hold one dumbbell vertically overhead with both hands, palms up, elbows close to the ears.' },
      { phase: 1, text: 'Keeping the upper arms still, lower the dumbbell in an arc behind the head until the triceps stretch.' },
      { phase: 0, text: 'Extend the elbows to return overhead and squeeze. Ribs down — no back arch.' },
    ],
  },

  'tempo-db-rdl': {
    source: 'Stiff-Legged_Dumbbell_Deadlift',
    note: 'Photos show the dumbbell stiff-legged deadlift — the same hinge. Apply the 3s lower and 1s pause.',
    videoQuery: 'dumbbell romanian deadlift proper form tempo',
    steps: [
      { phase: 0, text: 'Stand with dumbbells at the thighs, feet hip-width, knees soft.' },
      { phase: 1, text: 'Push the hips straight back and hinge over 3 seconds, weights grazing the shins, back flat.' },
      { phase: 1, text: 'Pause one second at mid-shin — deep hamstring stretch, no bouncing.' },
      { phase: 0, text: 'Drive the hips forward to stand tall and squeeze the glutes. No leaning back.' },
    ],
  },

  'seated-db-shoulder-press': {
    source: 'Seated_Dumbbell_Press',
    videoQuery: 'seated dumbbell shoulder press proper form',
    steps: [
      { phase: 0, text: 'Set the bench to 75–80° and sit with dumbbells at the shoulders, elbows about 45° forward — not flared.' },
      { phase: 1, text: 'Press overhead without shrugging, stopping just short of elbow lockout.' },
      { phase: 0, text: 'Lower under control to ear height, shoulders staying packed.' },
    ],
  },

  'one-arm-tripod-db-row': {
    source: 'One-Arm_Dumbbell_Row',
    videoQuery: 'one arm dumbbell row bench proper form',
    steps: [
      { phase: 0, text: 'Place one knee and the same-side hand on a flat bench, hips square, back flat like a table.' },
      { phase: 0, text: 'Let the dumbbell hang at arm’s length under the shoulder.' },
      { phase: 1, text: 'Pull the dumbbell to the hip crease, driving the elbow past the torso without twisting.' },
      { phase: 0, text: 'Lower to a full stretch. Finish all reps, then switch sides.' },
    ],
  },

  'flat-bb-skull-crusher': {
    source: 'EZ-Bar_Skullcrusher',
    note: 'Shown with an EZ bar — use your fixed 10/15 kg straight bar.',
    videoQuery: 'barbell skull crusher lying triceps extension form',
    steps: [
      { phase: 0, text: 'Lie on a flat bench and press the bar over the chest with a close grip, elbows pointing up.' },
      { phase: 1, text: 'Bend only the elbows and lower the bar toward the forehead — upper arms stay frozen.' },
      { phase: 0, text: 'Extend the elbows to lift back to the start. No shoulder movement.' },
    ],
  },

  'incline-db-bicep-curl': {
    source: 'Incline_Dumbbell_Curl',
    videoQuery: 'incline dumbbell curl proper form stretch',
    steps: [
      { phase: 0, text: 'Set the bench to 45° and sit back with arms hanging straight down behind the torso.' },
      { phase: 1, text: 'Curl both dumbbells up without letting the elbows drift forward.' },
      { phase: 1, text: 'Squeeze at the top.' },
      { phase: 0, text: 'Lower slowly to a full hang — the long-head stretch is the point of this exercise.' },
    ],
  },

  'one-and-half-db-squat': {
    source: 'Dumbbell_Squat',
    note: 'Photos show a full squat — add the half rep: down → half up → down → stand = 1 rep.',
    videoQuery: '1.5 rep dumbbell squat form',
    steps: [
      { phase: 0, text: 'Hold dumbbells at the sides, feet shoulder-width, chest tall.' },
      { phase: 1, text: 'Sit all the way down to full depth, heels planted.' },
      { phase: 1, text: 'Come up only halfway, then drop straight back to full depth.' },
      { phase: 0, text: 'Now stand all the way up. That whole cycle counts as one rep.' },
    ],
  },

  'weighted-bench-hip-thrust': {
    source: 'Barbell_Hip_Thrust',
    note: 'Shown with a barbell — balance your 15 kg dumbbell across the hip crease instead.',
    videoQuery: 'dumbbell hip thrust bench proper form',
    steps: [
      { phase: 0, text: 'Upper back on the bench edge, dumbbell across the hip crease, feet planted under the knees.' },
      { phase: 1, text: 'Drive through the feet and squeeze the glutes to lift the hips until the torso is level with the bench.' },
      { phase: 1, text: 'Hold the top briefly, ribs down — don’t hyperextend the lower back.' },
      { phase: 0, text: 'Lower under control until the hips hover just above the floor.' },
    ],
  },

  'pause-flat-db-bench-press': {
    source: 'Dumbbell_Bench_Press',
    note: 'Add the program’s strict 1-second pause just above the chest on every rep.',
    videoQuery: 'pause dumbbell bench press proper form',
    steps: [
      { phase: 0, text: 'Lie on a flat bench with dumbbells pressed over the chest, shoulder blades pinned.' },
      { phase: 1, text: 'Lower under control to just above the chest, elbows about 45° from the torso.' },
      { phase: 1, text: 'Pause a strict one second — no bounce, no resting the weights on the chest.' },
      { phase: 0, text: 'Drive the dumbbells back up and squeeze the chest.' },
    ],
  },

  'bent-over-bb-row': {
    source: 'Bent_Over_Barbell_Row',
    videoQuery: 'bent over barbell row proper form 45 degrees',
    steps: [
      { phase: 0, text: 'Hinge to a 45° torso with a flat back, bar hanging under the shoulders, knees soft.' },
      { phase: 1, text: 'Row the bar to the lower sternum, elbows tracking back past the torso.' },
      { phase: 0, text: 'Lower with control to straight arms — the torso stays frozen, no heaving.' },
    ],
  },

  'db-lateral-raise': {
    source: 'Side_Lateral_Raise',
    videoQuery: 'dumbbell lateral raise proper form',
    steps: [
      { phase: 0, text: 'Stand with light dumbbells at the sides, a slight forward lean and soft elbows.' },
      { phase: 1, text: 'Lead with the elbows and float the weights out to shoulder height — no higher.' },
      { phase: 0, text: 'Lower slowly, resisting all the way down. No swinging or shrugging.' },
    ],
  },

  'wide-grip-bb-upright-row': {
    source: 'Upright_Barbell_Row',
    videoQuery: 'wide grip barbell upright row proper form',
    steps: [
      { phase: 0, text: 'Take a wide overhand grip on the 10 kg bar, resting at the thighs.' },
      { phase: 1, text: 'Pull the elbows high and wide, sliding the bar up to lower-chest height.' },
      { phase: 0, text: 'Lower with control. If the shoulders pinch, stop the pull a little lower.' },
    ],
  },
};