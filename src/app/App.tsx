import { HashRouter } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <HashRouter>
      <Providers>
        <AppRouter />
      </Providers>
      <SpeedInsights />
    </HashRouter>
  );
}