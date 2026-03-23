import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/crypto/Footer'
import { Header } from './components/crypto/Header'

const VaultPage = lazy(() => import('./pages/VaultPage').then((module) => ({ default: module.VaultPage })))
const TeamPage = lazy(() => import('./pages/TeamPage').then((module) => ({ default: module.TeamPage })))

function App() {
  return (
    <div className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="vault-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />

      <main className="mx-auto max-w-6xl">
        <Header />

        <Suspense
          fallback={
            <section className="vault-panel rounded-2xl border border-slate-700/80 p-4 text-sm text-slate-300">
              Cargando pagina...
            </section>
          }
        >
          <Routes>
            <Route path="/" element={<VaultPage />} />
            <Route path="/equipo" element={<TeamPage />} />
          </Routes>
        </Suspense>

        <Footer />
      </main>
    </div>
  )
}

export default App
