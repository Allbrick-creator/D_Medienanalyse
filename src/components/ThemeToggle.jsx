import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button className="theme-toggle" onClick={toggle} title="Farbschema wechseln">
      {theme === 'dark' ? '☀ Hell' : '☾ Dunkel'}
    </button>
  )
}
