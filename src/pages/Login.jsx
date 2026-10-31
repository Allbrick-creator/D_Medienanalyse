import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await signIn(email.trim(), password)

    if (err) {
      setError(`Fehler: ${err.message}`)
      setLoading(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="login-page">
      {/* Theme-Toggle oben rechts */}
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <ThemeToggle />
      </div>

      <div className="login-card">
        <div className="login-logo">
          <h1>Medienanalyse</h1>
          <p>Schulprojekt Deutschunterricht</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>

        <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
          Zugangsdaten erhältst du von deiner Lehrperson.
        </p>
      </div>
    </div>
  )
}
