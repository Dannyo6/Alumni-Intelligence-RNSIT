import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const mock = (name: string) =>
  fileURLToPath(new URL(`./src/__preview__/mocks/${name}`, import.meta.url));

/**
 * Local-only visual harness config.
 *
 * Pages import their services as `../services/<name>`; the mocks import the real
 * modules as `../../services/<name>`, so these exact-match aliases redirect the
 * pages without the mocks resolving back onto themselves.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^\.\.\/services\/directoryService$/, replacement: mock('directoryService.ts') },
      { find: /^\.\.\/services\/dataQualityService$/, replacement: mock('dataQualityService.ts') },
      { find: /^\.\.\/services\/dashboardService$/, replacement: mock('dashboardService.ts') },
      { find: /^\.\.\/services\/adminService$/, replacement: mock('adminService.ts') },
      { find: /^\.\.\/contexts\/AuthContext$/, replacement: mock('AuthContext.tsx') },
    ],
  },
});
