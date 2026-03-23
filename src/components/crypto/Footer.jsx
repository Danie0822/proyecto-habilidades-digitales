export function Footer() {
  return (
    <footer className="mt-8 border-t border-slate-800 pt-4 text-sm text-slate-400">
      <p className="font-mono text-xs">Todo se procesa localmente. No enviamos archivos ni contraseñas a ningun servidor.</p>
      <nav className="mt-2 flex flex-wrap gap-4 text-xs">
        <a className="hover:text-amber-300" href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API" target="_blank" rel="noreferrer">
          WebCrypto
        </a>
        <a className="hover:text-amber-300" href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank" rel="noreferrer">
          WCAG
        </a>
        <a className="hover:text-amber-300" href="https://github.com/Stuk/jszip" target="_blank" rel="noreferrer">
          JSZip
        </a>
      </nav>
    </footer>
  )
}
