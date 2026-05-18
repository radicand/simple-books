import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  define: {
    __REFERENCE_DATE__: JSON.stringify(process.env.REFERENCE_DATE ?? ''),
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      // SSR prod bundle must not call jsxDEV (undefined in production React).
      'react/jsx-dev-runtime': 'react/jsx-runtime',
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: 'bun' }),
    viteReact({ jsxRuntime: 'automatic' }),
  ],
})
