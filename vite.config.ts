import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks cache across deploys. The Gemini SDK is left
        // out so it stays in the lazily loaded coach chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@firebase/ai') || id.includes('firebase/ai')) return undefined;
          if (id.includes('@firebase/firestore')) return 'firestore';
          if (id.includes('@firebase/auth')) return 'firebase-auth';
          if (id.includes('firebase')) return 'firebase';
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
