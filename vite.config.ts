import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Production Content Security Policy. Injected only for `vite build` (dev HMR needs inline scripts). */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'isyarat-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cspPlugin()],
  // `e2e` mode is a production build that also exposes window.__isyaratDebug for Playwright.
  build: { outDir: mode === 'e2e' ? 'dist-e2e' : 'dist', chunkSizeWarningLimit: 900 },
  preview: { port: mode === 'e2e' ? 4173 : 4174, strictPort: true },
}));
