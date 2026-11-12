import { HashRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRouter } from './router';

export function App() {
  return (
    <HashRouter>
      <Providers>
        <AppRouter />
      </Providers>
    </HashRouter>
  );
}