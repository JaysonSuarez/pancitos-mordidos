import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// SPA: las rutas con hash (#menu / #pedir) se resuelven en el cliente,
// pero dejamos el rewrite por si se accede a rutas sin hash.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
})
