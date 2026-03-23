import { NavLink } from 'react-router-dom'
import { useTheme } from '../../context/ThemeContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

function VaultLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 80" className="h-10 w-10 text-amber-400">
      <defs>
        <linearGradient id="hood" x1="12" y1="10" x2="66" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12203d" />
          <stop offset="1" stopColor="#0a1226" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="35" fill="#070d1d" stroke="currentColor" strokeWidth="3" />
      <path
        d="M16 56c0-14 8-24 24-30c16 6 24 16 24 30"
        fill="url(#hood)"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <rect x="24" y="36" width="32" height="10" rx="4" fill="#081327" stroke="#39ff8f" strokeWidth="2" />
      <path d="M30 41h8M42 41h8" stroke="#39ff8f" strokeWidth="2" strokeLinecap="round" />
      <path d="M29 53c3 3 7 4 11 4s8-1 11-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 16v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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
          <p className="font-mono text-xs text-slate-400">Seguridad en tu dispositivo</p>
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
