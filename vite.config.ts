import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // paths relativos para funcionar com loadFile no Electron
  server: {
    port: 3000
  }
});
