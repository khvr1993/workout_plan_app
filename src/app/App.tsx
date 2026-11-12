import { HashRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from './ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Providers>
          <AppRouter />
        </Providers>
      </HashRouter>
    </ErrorBoundary>
  );
}