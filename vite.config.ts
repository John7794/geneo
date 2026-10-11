import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(() => {
  return {
    plugins: [
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: 'data',
            dest: '.'
          },
          {
            src: 'scripts',
            dest: '.'
          },
          {
            src: 'assets',
            dest: '.'
          },
          {
            src: 'css',
            dest: '.'
          }
        ]
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
