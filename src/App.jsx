import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider }  from './hooks/useTheme'
import { AuthProvider }   from './hooks/useAuth'
import ProtectedRoute     from './components/ProtectedRoute'
import Layout             from './components/Layout'
import Login              from './pages/Login'
import Dashboard          from './pages/Dashboard'
import Packages           from './pages/Packages'
import Capture            from './pages/Capture'
import Data               from './pages/Data'
import Analysis           from './pages/Analysis'
import Calibration        from './pages/Calibration'
import Presentation       from './pages/Presentation'
import Settings           from './pages/Settings'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Öffentliche Route */}
            <Route path="/login" element={<Login />} />

            {/* Geschützte Routen unter gemeinsamen Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"     element={<Dashboard />} />
              <Route path="pakete"        element={<Packages />} />
              <Route path="erfassen"      element={<Capture />} />
              <Route path="erfassen/:paketId" element={<Capture />} />
              <Route path="daten"         element={<Data />} />
              <Route path="auswertung"    element={<Analysis />} />
              <Route path="auswertung/*"  element={<Analysis />} />
              <Route path="kalibrierung"  element={<Calibration />} />
              <Route path="praesentation" element={<Presentation />} />
              <Route path="einstellungen" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
