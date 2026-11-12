import type { Program, WarmupDrill } from './types';

export const LOAD_OPTIONS = [7.5, 10, 15];

export const warmup: WarmupDrill[] = [
  { id: 'arm-circles', label: 'Arm circles', seconds: 20 },
  { id: 'leg-swings', label: 'Leg swings', seconds: 20 },
  { id: 'bw-squats', label: 'Bodyweight squats', seconds: 30 },
  { id: 'band-pull-aparts', label: 'Band pull-aparts', seconds: 30 },
];

export const program: Program = {
  id: 'lean-muscle-3day',
  name: '3-Day Full-Body Lean Muscle',
  version: 1,
  days: [
    {
      id: 'day-a',
      label: 'Day 1',
      title: 'Full Body 1',
      emphasis: 'Quad & Upper Chest',
      focus: ['Quads', 'Glutes', 'Upper Chest', 'Back', 'Biceps', 'Triceps'],
      estimatedMinutes: 22,
      warmupMinutes: 2,
      blocks: [
        {
          id: 'a-b1',
          label: 'Block 1',
          superset: false,
          restSeconds: 60,
          exercises: [
            {
              id: 'bulgarian-split-squat',
              name: 'Bulgarian Split Squat',
              sets: 3,
              reps: { min: 10, max: 12, unit: 'perLeg' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + flat bench',
              execution:
                'Rear foot elevated on the bench, DBs at your sides. Lower the back knee with a slight forward torso lean, then drive through the front heel.',
              cue: 'One leg makes 30 kg feel like 60 kg on a barbell.',
            },
          ],
        },
        {
          id: 'a-b2',
          label: 'Block 2',
          superset: true,
          restSeconds: 60,
          exercises: [
            {
              id: 'incline-db-press',
              name: 'Incline Dumbbell Press',
              sets: 3,
              reps: { min: 10, max: 12, unit: 'reps' },
              tempo: '2-0-1-0',
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + 30° incline bench',
              execution: '30° bench. Press up with a 2-second lowering phase.',
              cue: 'Same bench angle and DBs as the row — zero setup time.',
            },
            {
              id: 'chest-supported-db-row',
              name: 'Chest-Supported Dumbbell Row',
              sets: 3,
              reps: { min: 10, max: 12, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + 30° incline bench',
              execution: 'Chest against the incline pad, row the DBs toward your hips.',
              cue: 'Targets upper back and lats without lower-back fatigue.',
            },
          ],
        },
        {
          id: 'a-b3',
          label: 'Block 3',
          superset: true,
          restSeconds: 45,
          exercises: [
            {
              id: 'standing-bb-curl',
              name: 'Standing Barbell Bicep Curl',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'barbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg barbell',
              execution: 'Strict curls with elbows pinned to your ribs.',
              cue: 'Squeeze for a full second at the top.',
            },
            {
              id: 'overhead-db-tricep-extension',
              name: 'Overhead Dumbbell Tricep Extension',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'single-dumbbell',
              loadOptions: LOAD_OPTIONS,
              equipment: 'Single 7.5–15 kg DB',
              execution: 'Hold one DB vertically overhead with both hands, lower behind the head.',
              cue: 'Keep elbows narrow to keep tension on the long head.',
            },
          ],
        },
      ],
    },
    {
      id: 'day-b',
      label: 'Day 2',
      title: 'Full Body 2',
      emphasis: 'Hamstring, Overhead & Back',
      focus: ['Hamstrings', 'Glutes', 'Shoulders', 'Back', 'Triceps', 'Biceps'],
      estimatedMinutes: 22,
      warmupMinutes: 2,
      blocks: [
        {
          id: 'b-b1',
          label: 'Block 1',
          superset: false,
          restSeconds: 60,
          exercises: [
            {
              id: 'tempo-db-rdl',
              name: 'Tempo Dumbbell RDL',
              sets: 4,
              reps: { min: 12, max: 12, unit: 'reps' },
              tempo: '3-1-1-0',
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs',
              execution:
                'Hinge with a straight back, weights grazing your shins. 3 seconds down, 1-second pause at mid-shin, then snap the hips forward.',
              cue: 'Upgrade path: B-stance at 80% load.',
            },
          ],
        },
        {
          id: 'b-b2',
          label: 'Block 2',
          superset: true,
          restSeconds: 60,
          exercises: [
            {
              id: 'seated-db-shoulder-press',
              name: 'Seated Dumbbell Shoulder Press',
              sets: 3,
              reps: { min: 10, max: 12, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + 75–80° bench',
              execution: 'Bench at 75–80°. Keep elbows about 45° forward of your torso.',
              cue: 'Elbows slightly forward protects the rotator cuffs.',
            },
            {
              id: 'one-arm-tripod-db-row',
              name: 'One-Arm Tripod Dumbbell Row',
              sets: 3,
              reps: { min: 10, max: 12, unit: 'perSide' },
              loadType: 'single-dumbbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DB + flat bench',
              execution: 'Knee and same-side hand on the pad, flat back, pull the DB toward your hip crease.',
              cue: 'Pull to the hip, not the shoulder — the lat does the work.',
            },
          ],
        },
        {
          id: 'b-b3',
          label: 'Block 3',
          superset: true,
          restSeconds: 45,
          exercises: [
            {
              id: 'flat-bb-skull-crusher',
              name: 'Flat Barbell Skull Crusher',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'barbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg barbell + flat bench',
              execution: 'Lie on the flat bench. Bend at the elbows only, lowering the bar toward your forehead.',
              cue: 'Upper arms stay vertical — elbows are the only hinge.',
            },
            {
              id: 'incline-db-bicep-curl',
              name: 'Incline Dumbbell Bicep Curl',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + 45° bench',
              execution: '45° bench, arms hanging behind your torso for a long-head stretch. Curl without swinging the elbows forward.',
              cue: 'The stretch behind the torso is the point — don’t shorten it.',
            },
          ],
        },
      ],
    },
    {
      id: 'day-c',
      label: 'Day 3',
      title: 'Full Body 3',
      emphasis: 'Glute, Flat Chest & Side Delt',
      focus: ['Glutes', 'Quads', 'Chest', 'Back', 'Side Delts'],
      estimatedMinutes: 22,
      warmupMinutes: 2,
      blocks: [
        {
          id: 'c-b1',
          label: 'Block 1',
          superset: true,
          restSeconds: 60,
          exercises: [
            {
              id: 'one-and-half-db-squat',
              name: '1.5-Rep Dumbbell Squat',
              sets: 3,
              reps: { min: 12, max: 12, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs',
              execution: 'Full down, halfway up, back down, stand tall. That whole sequence is one rep.',
              cue: 'Count the half-rep honestly — it doubles the time under tension.',
            },
            {
              id: 'weighted-bench-hip-thrust',
              name: 'Weighted Bench Hip Thrust',
              sets: 3,
              reps: { min: 12, max: 12, unit: 'reps' },
              loadType: 'single-dumbbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DB + flat bench',
              execution: 'Upper back on the bench, DB across your hips. Drive hips to full extension and squeeze.',
              cue: 'Ribs down, chin tucked — move at the hips, not the lower back.',
            },
          ],
        },
        {
          id: 'c-b2',
          label: 'Block 2',
          superset: true,
          restSeconds: 60,
          exercises: [
            {
              id: 'pause-flat-db-bench-press',
              name: 'Pause Flat Dumbbell Bench Press',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs + flat bench',
              execution: 'Lower under control, pause one second one inch above the chest, then press. No bounce.',
              cue: 'The pause kills the stretch reflex — your chest owns every rep.',
            },
            {
              id: 'bent-over-bb-row',
              name: 'Bent-Over Barbell Row',
              sets: 3,
              reps: { min: 12, max: 15, unit: 'reps' },
              loadType: 'barbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg barbell',
              execution: 'Hinge to a 45° torso, flat back, row the bar to your lower sternum.',
              cue: 'Torso stays frozen — no heaving with the lower back.',
            },
          ],
        },
        {
          id: 'c-b3',
          label: 'Block 3',
          superset: true,
          restSeconds: 45,
          exercises: [
            {
              id: 'db-lateral-raise',
              name: 'Dumbbell Lateral Raise',
              sets: 3,
              reps: { min: 15, max: 15, unit: 'reps' },
              loadType: 'dumbbells',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg DBs',
              execution: 'Slight forward lean, lead with the elbows, raise to shoulder height.',
              cue: 'Pour the pitchers at the top — elbows higher than wrists.',
            },
            {
              id: 'wide-grip-bb-upright-row',
              name: 'Wide-Grip Barbell Upright Row',
              sets: 3,
              reps: { min: 15, max: 15, unit: 'reps' },
              loadType: 'barbell',
              loadOptions: LOAD_OPTIONS,
              equipment: '7.5–15 kg barbell',
              execution: 'Wide grip, pull the bar to lower-chest height, elbows leading.',
              cue: 'Stop at lower chest — higher pulls jam the shoulder.',
            },
          ],
        },
      ],
    },
  ],
};

export function findExercise(p: Program, exerciseId: string) {
  for (const day of p.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        if (ex.id === exerciseId) return { day, block, exercise: ex };
      }
    }
  }
  return null;
}

export function allExercises(p: Program) {
  return p.days.flatMap((d) => d.blocks.flatMap((b) => b.exercises));
}