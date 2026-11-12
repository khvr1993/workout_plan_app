import { useState, type FormEvent, type ReactNode } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import type { Exercise, LoadType, RepUnit } from '../../data/types';
import { exerciseSchema } from '../../data/schema';
import { LOAD_OPTIONS } from '../../data/program';
import { Button } from '../ui/Button';
import { Stepper } from '../ui/Stepper';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../lib/cn';

export const LOAD_TYPE_OPTIONS: Array<{ value: LoadType; label: string }> = [
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'single-dumbbell', label: 'Single DB' },
  { value: 'bodyweight', label: 'Bodyweight' },
];

export function loadTypeLabel(loadType: LoadType): string {
  return LOAD_TYPE_OPTIONS.find((o) => o.value === loadType)?.label ?? loadType;
}

const REP_UNIT_OPTIONS: Array<{ value: RepUnit; label: string }> = [
  { value: 'reps', label: 'Reps' },
  { value: 'perLeg', label: 'Per leg' },
  { value: 'perSide', label: 'Per side' },
];

// The progression engine derives its 2/3/4s eccentric lever from the first digit.
const TEMPO_RE = /^[2-4]-\d{1,2}-\d{1,2}-\d{1,2}$/;

function standardWeights(loadType: LoadType): number[] {
  return loadType === 'bodyweight' ? [] : [...LOAD_OPTIONS];
}

function customId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `custom-${slug || 'exercise'}-${Date.now().toString(36)}`;
}

const inputCls =
  'h-11 w-full rounded-sm border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-muted transition-colors hover:border-border-strong focus:border-border-strong';

function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-label text-text-muted block mb-2">
          {label}
          {optional && <span className="normal-case tracking-normal font-normal"> · optional</span>}
        </label>
      ) : (
        <span className="text-label text-text-muted block mb-2">
          {label}
          {optional && <span className="normal-case tracking-normal font-normal"> · optional</span>}
        </span>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-body-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-body-sm text-text-muted">{hint}</p>
      )}
    </div>
  );
}

export interface ExerciseFormProps {
  onSubmit: (exercise: Exercise) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ExerciseForm({ onSubmit, onCancel, submitLabel = 'Add exercise' }: ExerciseFormProps) {
  const [name, setName] = useState('');
  const [sets, setSets] = useState(3);
  const [repMin, setRepMin] = useState(10);
  const [repMax, setRepMax] = useState(12);
  const [repUnit, setRepUnit] = useState<RepUnit>('reps');
  const [tempo, setTempo] = useState('');
  const [loadType, setLoadType] = useState<LoadType>('dumbbells');
  const [weights, setWeights] = useState<number[]>(standardWeights('dumbbells'));
  const [customWeight, setCustomWeight] = useState('');
  const [equipment, setEquipment] = useState('');
  const [execution, setExecution] = useState('');
  const [cue, setCue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) =>
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  const changeLoadType = (next: LoadType) => {
    setLoadType(next);
    setWeights(standardWeights(next));
    clearError('weights');
  };

  const toggleWeight = (kg: number) => {
    setWeights((ws) =>
      ws.includes(kg) ? ws.filter((w) => w !== kg) : [...ws, kg].sort((a, b) => a - b),
    );
    clearError('weights');
  };

  const addCustomWeight = () => {
    const parsed = Number(customWeight.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) {
      setErrors((e) => ({ ...e, customWeight: 'Enter a positive weight in kg (up to 500).' }));
      return;
    }
    const rounded = Math.round(parsed * 10) / 10;
    setWeights((ws) => (ws.includes(rounded) ? ws : [...ws, rounded].sort((a, b) => a - b)));
    setCustomWeight('');
    clearError('customWeight');
    clearError('weights');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give the exercise a name.';
    const tempoTrimmed = tempo.trim();
    if (tempoTrimmed && !TEMPO_RE.test(tempoTrimmed)) {
      next.tempo = 'Use four numbers like 3-1-1-0 — the lowering phase must be 2–4s.';
    }
    if (loadType !== 'bodyweight' && weights.length === 0) {
      next.weights = 'Pick at least one weight, or switch to bodyweight.';
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    const exercise: Exercise = {
      id: customId(name),
      name: name.trim(),
      sets,
      reps: { min: repMin, max: repMax, unit: repUnit },
      ...(tempoTrimmed ? { tempo: tempoTrimmed } : {}),
      loadType,
      loadOptions: loadType === 'bodyweight' ? [] : [...weights].sort((a, b) => a - b),
      equipment: equipment.trim(),
      execution: execution.trim(),
      cue: cue.trim(),
    };
    const parsed = exerciseSchema.safeParse(exercise);
    if (!parsed.success) {
      setErrors({ name: parsed.error.issues[0]?.message ?? 'Check the fields and try again.' });
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  const chipWeights = [...new Set([...standardWeights(loadType), ...weights])].sort(
    (a, b) => a - b,
  );
  const repSuffix = repUnit === 'perLeg' ? ' / leg' : repUnit === 'perSide' ? ' / side' : '';
  const repRange = repMin === repMax ? `${repMin}` : `${repMin}–${repMax}`;
  const sortedWeights = [...weights].sort((a, b) => a - b);
  const loadSummary =
    loadType === 'bodyweight'
      ? 'bodyweight'
      : sortedWeights.length > 0
        ? `${sortedWeights.join(' / ')} kg`
        : 'no weights picked';
  const preview = `${sets} × ${repRange}${repSuffix} · ${loadTypeLabel(loadType)} · ${loadSummary}${
    tempo.trim() ? ` · tempo ${tempo.trim()}` : ''
  }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <a
        href="https://yuhonas.github.io/free-exercise-db/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-body-sm text-text-secondary transition-colors hover:text-text"
      >
        <ExternalLink size={13} strokeWidth={1.5} />
        Browse exercise references — free-exercise-db
      </a>

      <Field label="Name" htmlFor="ex-name" error={errors.name}>
        <input
          id="ex-name"
          autoFocus
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            clearError('name');
          }}
          placeholder="e.g. Farmer Carry"
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
          className={cn(inputCls, errors.name && 'border-danger')}
        />
      </Field>

      <div>
        <span className="text-label text-text-muted block mb-2">Volume</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <label className="flex items-center gap-2 text-body-sm text-text-muted">
            Sets
            <Stepper value={sets} min={1} max={10} ariaLabel="Sets" onChange={setSets} />
          </label>
          <div className="flex items-center gap-2 text-body-sm text-text-muted">
            Reps
            <Stepper
              value={repMin}
              min={1}
              max={repMax}
              ariaLabel="Minimum reps"
              onChange={setRepMin}
            />
            <span aria-hidden>–</span>
            <Stepper
              value={repMax}
              min={repMin}
              max={50}
              ariaLabel="Maximum reps"
              onChange={setRepMax}
            />
          </div>
        </div>
        <div className="mt-3">
          <SegmentedControl
            size="sm"
            ariaLabel="Rep unit"
            options={REP_UNIT_OPTIONS}
            value={repUnit}
            onChange={setRepUnit}
          />
        </div>
      </div>

      <Field
        label="Tempo"
        htmlFor="ex-tempo"
        optional
        hint="Seconds: lower–pause–lift–pause. Lowering must be 2–4s, e.g. 3-1-1-0."
        error={errors.tempo}
      >
        <input
          id="ex-tempo"
          value={tempo}
          onChange={(e) => {
            setTempo(e.target.value);
            clearError('tempo');
          }}
          placeholder="3-1-1-0"
          aria-invalid={Boolean(errors.tempo)}
          className={cn(inputCls, 'tnum', errors.tempo && 'border-danger')}
        />
      </Field>

      <Field label="Load type">
        <SegmentedControl
          size="sm"
          ariaLabel="Load type"
          options={LOAD_TYPE_OPTIONS}
          value={loadType}
          onChange={changeLoadType}
        />
      </Field>

      {loadType === 'bodyweight' ? (
        <p className="text-body-sm text-text-muted rounded-sm border border-border bg-surface-2 px-3 py-2.5 -mt-2">
          No load needed — rounds log reps only.
        </p>
      ) : (
        <Field
          label="Available weights (kg)"
          hint="Toggle the denominations you actually have. Add others below."
          error={errors.weights}
        >
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Available weights">
            {chipWeights.map((kg) => {
              const selected = weights.includes(kg);
              return (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`Toggle ${kg} kg`}
                  onClick={() => toggleWeight(kg)}
                  className={cn(
                    'h-11 min-w-11 px-2 rounded-sm border text-[13px] font-medium tnum transition-colors duration-150 cursor-pointer select-none',
                    selected
                      ? 'bg-accent-soft border-accent text-accent'
                      : 'bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text',
                  )}
                >
                  {kg}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={customWeight}
              onChange={(e) => {
                setCustomWeight(e.target.value);
                clearError('customWeight');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomWeight();
                }
              }}
              inputMode="decimal"
              placeholder="Other kg"
              aria-label="Custom weight in kg"
              aria-invalid={Boolean(errors.customWeight)}
              className={cn(
                'h-11 w-28 shrink-0 rounded-sm border border-border bg-surface-2 px-3 text-sm tnum text-text placeholder:text-text-muted transition-colors hover:border-border-strong focus:border-border-strong',
                errors.customWeight && 'border-danger',
              )}
            />
            <Button variant="secondary" className="shrink-0" onClick={addCustomWeight}>
              <Plus size={14} strokeWidth={1.5} />
              Add weight
            </Button>
          </div>
          {errors.customWeight && (
            <p className="mt-1.5 text-body-sm text-danger" role="alert">
              {errors.customWeight}
            </p>
          )}
        </Field>
      )}

      <Field label="Equipment" htmlFor="ex-equipment" optional>
        <input
          id="ex-equipment"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder="15 kg DBs + flat bench"
          className={inputCls}
        />
      </Field>

      <Field label="Execution" htmlFor="ex-execution" optional>
        <textarea
          id="ex-execution"
          value={execution}
          onChange={(e) => setExecution(e.target.value)}
          rows={3}
          placeholder="Set up, move, and finish — one or two sentences."
          className="w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted resize-none transition-colors hover:border-border-strong focus:border-border-strong"
        />
      </Field>

      <Field label="Coach cue" htmlFor="ex-cue" optional>
        <textarea
          id="ex-cue"
          value={cue}
          onChange={(e) => setCue(e.target.value)}
          rows={2}
          placeholder="One short reminder to keep form honest."
          className="w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-muted resize-none transition-colors hover:border-border-strong focus:border-border-strong"
        />
      </Field>

      <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pt-3 pb-2">
        <p className="text-body-sm text-text-muted tnum truncate mb-2.5" aria-live="polite">
          {name.trim() || 'New exercise'} — {preview}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            <Plus size={15} strokeWidth={1.5} />
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}