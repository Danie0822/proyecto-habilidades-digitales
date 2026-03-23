import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { ActionCard } from '../components/crypto/ActionCard'

export function VaultPage() {
  const [activeOperation, setActiveOperation] = useState('encrypt')
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const canonicalUrl = `${origin}/`

  const pageTitle = useMemo(() => {
    if (activeOperation === 'decrypt') {
      return 'CryptoVault | Descifrar Localmente'
    }

    return 'CryptoVault | Cifrar Localmente'
  }, [activeOperation])

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={canonicalUrl} />
        <meta
          name="description"
          content="CryptoVault cifra y descifra archivos localmente en tu navegador usando WebCrypto API y sin backend."
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={pageTitle} />
        <meta
          property="og:description"
          content="Boveda criptografica local con AES-256-GCM y modo 3DES legacy para compatibilidad."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={`${origin}/favicon.svg`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta
          name="twitter:description"
          content="Cifrado y descifrado local de archivos con WebCrypto API en tu navegador."
        />
      </Helmet>

      <section className="mb-4 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
        <h2 className="font-ui text-lg font-semibold text-slate-100">Boveda de archivos client-side</h2>
        <p className="mt-2 text-sm text-slate-400">
          Sin servidores, sin persistencia de contraseñas, y con soporte real para binarios mediante
          WebCrypto API nativa.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Encrypt and decrypt cards">
        <ActionCard mode="encrypt" onActive={setActiveOperation} />
        <ActionCard mode="decrypt" onActive={setActiveOperation} />
      </section>
    </>
  )
}
