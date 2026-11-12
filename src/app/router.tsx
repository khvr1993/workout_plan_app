import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Today } from '../screens/Today';
import { Program } from '../screens/Program';
import { DayDetail } from '../screens/DayDetail';
import { Session } from '../screens/Session';
import { Skeleton } from '../components/ui/Skeleton';

const History = lazy(() => import('../screens/History'));
const SessionDetail = lazy(() => import('../screens/SessionDetail'));
const Progress = lazy(() => import('../screens/Progress'));
const ExerciseProgress = lazy(() => import('../screens/ExerciseProgress'));
const Settings = lazy(() => import('../screens/Settings'));

function RouteFallback() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Today />} />
          <Route path="program" element={<Program />} />
          <Route path="program/:dayId" element={<DayDetail />} />
          <Route path="history" element={<History />} />
          <Route path="history/:sessionId" element={<SessionDetail />} />
          <Route path="progress" element={<Progress />} />
          <Route path="progress/:exerciseId" element={<ExerciseProgress />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="session/:dayId" element={<Session />} />
      </Routes>
    </Suspense>
  );
}