import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/crypto/Footer'
import { Header } from './components/crypto/Header'
import { TeamPage } from './pages/TeamPage'
import { VaultPage } from './pages/VaultPage'

function App() {
  return (
    <div className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="vault-grid pointer-events-none absolute inset-0 -z-10 opacity-70" />

      <main className="mx-auto max-w-6xl">
        <Header />

        <Routes>
          <Route path="/" element={<VaultPage />} />
          <Route path="/equipo" element={<TeamPage />} />
        </Routes>

        <Footer />
      </main>
    </div>
  )
}

export default App
