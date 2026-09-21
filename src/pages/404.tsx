import { Link } from 'react-router-dom'

export function NotFound() {
  // Só quem está logado no sistema vê o caminho do Dashboard; visitante do cardápio nunca é levado para dentro do sistema.
  const logado = typeof window !== 'undefined' && !!localStorage.getItem('token')
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-4xl font-bold">Página não encontrada</h1>
      {logado ? (
        <p className="text-accent-foreground">
          Voltar para o{' '}
          <Link to="/" className="text-sky-600 dark:text-sky-400">
            Dashboard
          </Link>
        </p>
      ) : (
        <p className="text-accent-foreground">
          <Link to="/cardapio" className="text-sky-600 dark:text-sky-400">
            Voltar ao cardápio
          </Link>
        </p>
      )}
    </div>
  )
}
