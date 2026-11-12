import { useEffect, useState } from 'react';
import { ExternalLink, Pause, Play } from 'lucide-react';
import { DEMOS, demoImages, demoVideoUrl } from '../../data/demos';
import { IconButton } from '../ui/IconButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../lib/cn';

export interface ExerciseDemoProps {
  exerciseId: string;
  name: string;
  className?: string;
}

/**
 * Real start/end photos crossfading like a GIF, with numbered steps that
 * highlight in sync and an external video-search link. Photos are bundled
 * with the app, so the guide works offline; only the video link needs network.
 */
export function ExerciseDemo({ exerciseId, name, className }: ExerciseDemoProps) {
  const demo = DEMOS[exerciseId];
  const [phase, setPhase] = useState<0 | 1>(0);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    setPhase(0);
  }, [exerciseId]);

  useEffect(() => {
    if (!playing || !demo) return;
    const t = setInterval(() => setPhase((p) => (p === 0 ? 1 : 0)), 1600);
    return () => clearInterval(t);
  }, [playing, demo, exerciseId]);

  if (!demo) return null;

  const [start, end] = demoImages(exerciseId);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        className={cn(
          'relative mx-auto w-full overflow-hidden rounded-md border border-border bg-surface-2',
          demo.portrait ? 'aspect-[2/3] max-w-[260px]' : 'aspect-[3/2]',
        )}
      >
        <img
          src={start}
          alt={`${name} — start position`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
            phase === 0 ? 'opacity-100' : 'opacity-0',
          )}
        />
        <img
          src={end}
          alt={`${name} — end position`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
            phase === 1 ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span className="absolute left-2 top-2 rounded-xs border border-border bg-surface/90 px-2 py-0.5 text-label text-text-secondary">
          {phase === 0 ? 'Start' : 'End'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <IconButton
          label={playing ? 'Pause animation' : 'Play animation'}
          size="sm"
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
        </IconButton>
        <SegmentedControl
          size="sm"
          ariaLabel="Position"
          options={[
            { value: 0, label: 'Start' },
            { value: 1, label: 'End' },
          ]}
          value={phase}
          onChange={(v) => {
            setPhase(v as 0 | 1);
            setPlaying(false);
          }}
        />
        <a
          href={demoVideoUrl(demo)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-text"
        >
          <ExternalLink size={13} strokeWidth={1.5} />
          Videos
        </a>
      </div>

      <ol className="flex flex-col gap-1">
        {demo.steps.map((s, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2.5 rounded-sm px-2 py-1.5 transition-colors duration-300',
              s.phase === phase && 'bg-surface-2',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] tnum transition-colors duration-300',
                s.phase === phase ? 'border-border-strong text-text' : 'border-border text-text-muted',
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                'text-body-sm transition-colors duration-300',
                s.phase === phase ? 'text-text' : 'text-text-secondary',
              )}
            >
              {s.text}
            </span>
          </li>
        ))}
      </ol>

      {demo.note && <p className="text-body-sm text-text-muted">{demo.note}</p>}
      <p className="text-[11px] text-text-muted">
        Photos: free-exercise-db (public domain) · bundled for offline use
      </p>
    </div>
  );
}