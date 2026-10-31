import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null)
  const [profile, setProfile]       = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    // Nur onAuthStateChange verwenden – verhindert doppelten loadProfile-Aufruf
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setProfileError(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    setProfileError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Profil laden fehlgeschlagen:', error)
      setProfileError(error)
    }
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, profileError, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
