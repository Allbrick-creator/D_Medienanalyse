import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn(
    '[Medienanalyse] .env-Datei fehlt oder unvollständig.\n' +
    'Erstelle .env mit VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  url  || 'https://placeholder.supabase.co',
  key  || 'placeholder'
)
