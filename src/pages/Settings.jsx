import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function Settings() {
  const { profile } = useAuth()
  const [days, setDays]       = useState({ day1: '', day2: '', day3: '' })
  const [saving, setSaving]   = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.from('survey_settings').select('*').single().then(({ data }) => {
      if (data) setDays({ day1: data.day1 ?? '', day2: data.day2 ?? '', day3: data.day3 ?? '' })
    })
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('survey_settings')
      .update({ day1: days.day1 || null, day2: days.day2 || null, day3: days.day3 || null })
      .eq('id', 1)

    setSaving(false)
    setMessage(error ? 'Fehler beim Speichern.' : 'Gespeichert.')
    setTimeout(() => setMessage(''), 3000)
  }

  if (profile?.role !== 'admin' && profile?.role !== 'bewerter') {
    return (
      <div className="page-content">
        <div className="alert alert-error">Diese Seite ist nur für Admins und Bewerter zugänglich.</div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>Einstellungen</h1>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: 20 }}>Erhebungszeitraum</h2>

        {message && (
          <div className={`alert ${message.startsWith('Fehler') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          {['day1', 'day2', 'day3'].map((d, i) => (
            <div className="form-group" key={d}>
              <label className="form-label" htmlFor={d}>Tag {i + 1}</label>
              <input
                id={d}
                type="date"
                className="form-input"
                value={days[d]}
                onChange={e => setDays(prev => ({ ...prev, [d]: e.target.value }))}
              />
            </div>
          ))}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
