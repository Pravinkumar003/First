import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: "/",             // 🔥 Required for Azure Static Web Apps
  build: {
    outDir: "dist",      // 🔥 Ensures output folder name is dist
  }
});
