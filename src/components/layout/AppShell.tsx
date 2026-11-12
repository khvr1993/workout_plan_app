import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { MobileHeader } from './MobileHeader';
import { StorageBanners } from './SafeModeBanner';
import { BackupReminder } from './BackupReminder';

export function AppShell() {
  return (
    <div className="min-h-dvh bg-bg">
      <Sidebar />
      <MobileHeader />
      <div className="lg:pl-62">
        <StorageBanners />
        <main className="mx-auto w-full max-w-270 px-5 lg:px-12 pt-6 lg:pt-10 pb-24 lg:pb-16">
          <BackupReminder />
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 lg:mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-h1 text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  children,
  actions,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="mt-8 lg:mt-10">
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-label text-text-muted">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}