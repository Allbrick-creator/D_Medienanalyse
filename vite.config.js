import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Passe 'base' an den Namen deines GitHub-Repositories an, z.B. '/medienanalyse/'
export default defineConfig({
  plugins: [react()],
  base: '/D_Medienanalyse/',
})
