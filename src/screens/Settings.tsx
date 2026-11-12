import { useRef, useState } from 'react';
import { Upload, Trash2, Smartphone, Github, Check, ExternalLink } from 'lucide-react';
import { useAppStore, storage } from '../store/useAppStore';
import type { AppData, Settings as SettingsType } from '../data/types';
import { MAX_IMPORT_BYTES, parseImport } from '../lib/export';
import { BUILD_VERSION } from '../lib/version';
import { BackupExportButton } from '../components/layout/BackupReminder';
import { AutoBackupSettings } from '../components/layout/AutoBackupSettings';
import { PageHeader, Section } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Stepper } from '../components/ui/Stepper';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import { promptInstall, useInstallStore } from '../pwa/install';
import { cn } from '../lib/cn';
import { formatShort } from '../lib/date';

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-text">{label}</p>
        {hint && <p className="text-body-sm text-text-muted mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

const ACCENTS: Array<{ value: SettingsType['accent']; label: string; swatch: string }> = [
  { value: 'emerald', label: 'Emerald', swatch: '#10B981' },
  { value: 'indigo', label: 'Indigo', swatch: '#6366F1' },
  { value: 'amber', label: 'Amber', swatch: '#D97706' },
];

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const safeMode = useAppStore((s) => s.safeMode);
  const importAll = useAppStore((s) => s.importAll);
  const clearAll = useAppStore((s) => s.clearAll);
  const meta = useAppStore((s) => s.meta);
  const installDeferred = useInstallStore((s) => s.deferred);
  const installed = useInstallStore((s) => s.installed);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearStepTwo, setClearStepTwo] = useState(false);

  const usage = storage.usageBytes();
  const usageLabel =
    usage > 1024 * 1024 ? `${(usage / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(usage / 1024))} KB`;

  const handleFile = async (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      toast('File is too large to import (5 MB max).', 'error');
      return;
    }
    const text = await file.text();
    const result = parseImport(text);
    if (!result.ok) {
      toast(`Import failed: ${result.error}`, 'error');
      return;
    }
    setPendingImport(result.data);
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'unavailable') {
      toast('On iOS: Share → Add to Home Screen. On Android: browser menu → Install app.');
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Preferences, data, and app" />

      <Section title="Training">
        <Card className="!py-1">
          <Row
            label="Units"
            hint="Display only — logged sessions keep their own unit."
            control={
              <SegmentedControl
                ariaLabel="Units"
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
                value={settings.unit}
                onChange={(unit) => updateSettings({ unit })}
              />
            }
          />
          <Row
            label="Schedule"
            hint="Rotation trains 1 → 2 → 3 whenever you show up. Weekday adds Mon/Wed/Fri hints."
            control={
              <SegmentedControl
                ariaLabel="Schedule mode"
                options={[
                  { value: 'rotation', label: 'Rotation' },
                  { value: 'weekday', label: 'Weekday' },
                ]}
                value={settings.scheduleMode}
                onChange={(scheduleMode) => updateSettings({ scheduleMode })}
              />
            }
          />
          <Row
            label="Weekly target"
            control={
              <Stepper
                value={settings.weeklyTarget}
                min={1}
                max={7}
                ariaLabel="Weekly target sessions"
                onChange={(weeklyTarget) => updateSettings({ weeklyTarget })}
              />
            }
          />
          <Row
            label="Week starts on"
            control={
              <SegmentedControl
                ariaLabel="Week start"
                options={[
                  { value: 1, label: 'Mon' },
                  { value: 0, label: 'Sun' },
                ]}
                value={settings.weekStartsOn}
                onChange={(weekStartsOn) => updateSettings({ weekStartsOn })}
              />
            }
          />
          <Row
            label="Default rest"
            hint="Used when a block has no rest of its own."
            control={
              <div className="flex items-center gap-2">
                <Stepper
                  value={settings.restTimerDefaultSec}
                  min={15}
                  max={300}
                  ariaLabel="Default rest seconds"
                  onChange={(restTimerDefaultSec) => updateSettings({ restTimerDefaultSec })}
                />
                <span className="text-body-sm text-text-muted">s</span>
              </div>
            }
          />
          <Row
            label="Auto-start rest timer"
            control={
              <Switch
                label="Auto-start rest timer"
                checked={settings.autoStartRestTimer}
                onChange={(autoStartRestTimer) => updateSettings({ autoStartRestTimer })}
              />
            }
          />
          <Row
            label="Haptics"
            hint="Vibrate on set complete and timer end."
            control={
              <Switch
                label="Haptics"
                checked={settings.haptics}
                onChange={(haptics) => updateSettings({ haptics })}
              />
            }
          />
          <Row
            label="Tempo metronome"
            hint="Adds a tick button to tempo cues."
            control={
              <Switch
                label="Tempo metronome"
                checked={settings.metronome}
                onChange={(metronome) => updateSettings({ metronome })}
              />
            }
          />
          <Row
            label="Paused reps by default"
            hint="Pre-toggle the 1s bottom pause on new sets."
            control={
              <Switch
                label="Paused reps by default"
                checked={settings.defaultPaused}
                onChange={(defaultPaused) => updateSettings({ defaultPaused })}
              />
            }
          />
        </Card>
      </Section>

      <Section title="Appearance">
        <Card className="!py-1">
          <Row
            label="Theme"
            control={
              <SegmentedControl
                ariaLabel="Theme"
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
              />
            }
          />
          <Row
            label="Accent"
            control={
              <div className="flex items-center gap-2" role="group" aria-label="Accent color">
                {ACCENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    aria-pressed={settings.accent === a.value}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => updateSettings({ accent: a.value })}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors cursor-pointer',
                      settings.accent === a.value ? 'border-text' : 'border-transparent',
                    )}
                    style={{ background: a.swatch }}
                  >
                    {settings.accent === a.value && <Check size={14} strokeWidth={2.5} className="text-white" />}
                  </button>
                ))}
              </div>
            }
          />
        </Card>
      </Section>

      <Section title="Data">
        <p className="mb-3 text-body-sm text-text-muted">
          Automatic backup keeps one JSON file outside the app and overwrites it daily. A reminder
          appears every 3 days until a backup exists. Import restores any export.
        </p>
        <AutoBackupSettings />
        <Card className="!py-1 mt-3">
          <Row
            label="Export"
            hint={
              meta.lastBackupAt
                ? `Last backup ${formatShort(meta.lastBackupAt)}`
                : 'Download everything as JSON.'
            }
            control={<BackupExportButton label="Export" />}
          />
          <Row
            label="Import"
            hint="Replaces all data. Validated before anything changes."
            control={
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  aria-label="Import file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safeMode}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={14} strokeWidth={1.5} />
                  Import
                </Button>
              </>
            }
          />
          <Row
            label="Storage used"
            hint={usage > 3 * 1024 * 1024 ? 'Above 3 MB — export a backup soon.' : 'Stored locally on this device.'}
            control={
              <span className={cn('text-sm tnum', usage > 3 * 1024 * 1024 ? 'text-danger' : 'text-text-secondary')}>
                {usageLabel}
              </span>
            }
          />
          <Row
            label="Clear all data"
            hint="Sessions, edits, and settings. Two-step confirm."
            control={
              <Button variant="danger" size="sm" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} strokeWidth={1.5} />
                Clear
              </Button>
            }
          />
        </Card>
      </Section>

      <Section title="App">
        <Card className="!py-1">
          <Row
            label="Install"
            hint={
              installed
                ? 'Running as an installed app.'
                : 'Add to your home screen for offline, full-screen training.'
            }
            control={
              <Button
                variant="secondary"
                size="sm"
                onClick={handleInstall}
                disabled={installed || !installDeferred}
              >
                <Smartphone size={14} strokeWidth={1.5} />
                {installed ? 'Installed' : 'Install'}
              </Button>
            }
          />
          <Row
            label="Version"
            hint="Build stamp"
            control={<span className="text-sm text-text-secondary tnum">{BUILD_VERSION}</span>}
          />
          <Row
            label="Source"
            control={
              <a
                href="https://github.com/khvr1993/workout_plan_app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong transition-colors"
              >
                <Github size={14} strokeWidth={1.5} />
                GitHub
              </a>
            }
          />
          <Row
            label="Exercise photos"
            hint="Public-domain form photos, bundled for offline use."
            control={
              <a
                href="https://yuhonas.github.io/free-exercise-db/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface-2 px-3 text-[13px] font-medium text-text hover:border-border-strong transition-colors"
              >
                <ExternalLink size={14} strokeWidth={1.5} />
                free-exercise-db
              </a>
            }
          />
        </Card>
      </Section>

      <ConfirmDialog
        open={pendingImport != null}
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            const saved = importAll(pendingImport);
            toast(
              saved
                ? 'Data imported'
                : useAppStore.getState().storageError ?? 'Could not save the imported data.',
              saved ? 'success' : 'error',
            );
          }
        }}
        title="Import and replace?"
        body={`This replaces everything on this device with the export (${pendingImport?.sessions.length ?? 0} sessions). Export your current data first if you want a backup.`}
        confirmLabel="Replace data"
        danger
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={() => setClearStepTwo(true)}
        title="Clear all data?"
        body="Every session, program edit, and setting will be erased from this device. Consider exporting first."
        confirmLabel="Continue"
        danger
      />
      <ConfirmDialog
        open={clearStepTwo}
        onClose={() => setClearStepTwo(false)}
        onConfirm={() => {
          clearAll();
          toast('All data cleared');
        }}
        title="Really erase everything?"
        body="This cannot be undone. The app returns to a fresh Day 1."
        confirmLabel="Erase everything"
        danger
      />
    </div>
  );
}