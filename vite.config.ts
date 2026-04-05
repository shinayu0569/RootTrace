import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfig } from 'vite';

export default defineConfig((): UserConfig => {
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      worker: {
        format: 'es',
        plugins: () => [react()]
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          output: {
            manualChunks: {
              'reconstruction-worker': ['./mcmc.worker.ts']
            }
          }
        }
      }
    };
});
