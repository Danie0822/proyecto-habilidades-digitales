import { Helmet } from 'react-helmet-async'

const members = [
    { name: 'Daniel Alessandro Morales Sandoval', carnet: 'MS100425' },
    { name: 'Anderson Rene Figueroa Coto', carnet: 'FC100426' },
    { name: 'Edwin Francisco Martinez Serrano', carnet: 'MS100426' },
    { name: 'Jonatan Mauricio Avila Cabrera', carnet: 'AC100226' },
]

export function TeamPage() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const canonicalUrl = `${origin}/equipo`

    return (
        <>
            <Helmet>
                <title>CryptoVault | Equipo 3</title>
                <link rel="canonical" href={canonicalUrl} />
                <meta
                    name="description"
                    content="Integrantes del Equipo 3 y resumen de algoritmos de cifrado de CryptoVault."
                />
                <meta name="robots" content="index,follow" />
                <meta property="og:title" content="CryptoVault | Equipo 3" />
                <meta
                    property="og:description"
                    content="Conoce al Equipo 3 y el resumen tecnico de los algoritmos usados en CryptoVault."
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content={`${origin}/favicon.svg`} />
                <meta name="twitter:card" content="summary" />
            </Helmet>

            <section className="grid gap-4 lg:grid-cols-2">
                <article className="vault-panel rounded-2xl border border-slate-700/80 p-4">
                    <h2 className="font-ui text-lg font-semibold text-slate-100">Resumen de cifrados</h2>

                    <div className="mt-3 space-y-3">
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                            <h3 className="font-mono text-sm font-semibold text-emerald-300">AES-256-GCM (Recomendado)</h3>
                            <p className="mt-1 text-sm text-slate-300">
                                Cifra el archivo y genera un 'sello de autenticidad' en una sola operación.
                                Si alguien modifica el archivo cifrado, el sello lo detecta automáticamente
                                y el descifrado falla — garantizando tanto privacidad como integridad.
                            </p>
                        </div>

                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                            <h3 className="font-mono text-sm font-semibold text-amber-300">3DES-CBC (Legacy)</h3>
                            <p className="mt-1 text-sm text-slate-300">
                                Algoritmo de los años 90, mantenido para compatibilidad con sistemas
                                heredados. Solo cifra los datos, sin verificar si fueron alterados.
                                Algunos navegadores modernos ya no lo soportan.
                            </p>
                        </div>
                    </div>
                </article>

                <article className="vault-panel rounded-2xl border border-slate-700/80 p-4">
                    <h2 className="font-ui text-lg font-semibold text-slate-100">Equipo 3</h2>
                    <p className="mt-1 text-xs text-slate-400">Integrantes (nombre y carnet):</p>
                    <ul className="mt-3 space-y-2 font-mono text-sm text-slate-200">
                        {members.map((member) => (
                            <li key={member.carnet} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
                                <span>{member.name}</span>
                                <span className="text-slate-400">{member.carnet}</span>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>
        </>
    )
}
