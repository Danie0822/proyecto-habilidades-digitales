import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

function VaultLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 80" className="h-10 w-10 text-amber-400">
      <circle cx="40" cy="40" r="33" fill="none" stroke="currentColor" strokeWidth="5" />
      <circle cx="40" cy="40" r="13" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M40 24v10M40 46v10M24 40h10M46 40h10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/70 p-4 shadow-lg shadow-black/30">
      <div className="flex items-center gap-3">
        <VaultLogo />
        <div>
          <h1 className="font-ui text-xl font-semibold tracking-wide text-slate-100">CryptoVault</h1>
          <p className="font-mono text-xs text-slate-400">Secure client-side file vault</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <nav className="mr-1 flex items-center gap-2" aria-label="Navegacion principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-md border px-2 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`
            }
          >
            Vault
          </NavLink>
          <NavLink
            to="/equipo"
            className={({ isActive }) =>
              `rounded-md border px-2 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`
            }
          >
            Equipo 3
          </NavLink>
        </nav>
        <Badge tone="info">Procesamiento local</Badge>
        <Button
          variant="secondary"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="text-xs"
        >
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
      </div>
    </header>
  )
}
