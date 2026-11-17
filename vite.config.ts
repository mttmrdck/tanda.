import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

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
  // `https` mode (npm run dev:https): self-signed certificate so phones on the LAN get a secure context,
  // which browsers require for camera access. Dev only; never used for builds.
  plugins: [react(), tailwindcss(), cspPlugin(), ...(mode === 'https' ? [basicSsl({ name: 'isyarat-dev' })] : [])],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // `e2e` mode is a production build that also exposes window.__isyaratDebug for Playwright.
  build: {
    outDir: mode === 'e2e' ? 'dist-e2e' : 'dist',
    chunkSizeWarningLimit: 900,
    // Never inline fonts as data: URIs — the CSP allows fonts only from 'self'.
    assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  server: { proxy: { '/edge-api': { target:'http://127.0.0.1:4321', rewrite:path=>path.replace(/^\/edge-api/,'') } } },
  preview: { port: mode === 'e2e' ? 4319 : 4174, strictPort: true },
}));
