import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { ThemeSync } from './ui/theme/ThemeSync';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeSync />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
