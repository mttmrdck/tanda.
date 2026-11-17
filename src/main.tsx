import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './ui/theme/tanda.css';
import { App } from './App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { ThemeSync } from './ui/theme/ThemeSync';

if (import.meta.env.DEV || import.meta.env.MODE === 'e2e') {
  void import('./debugHooks').then((m) => m.install());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeSync />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
