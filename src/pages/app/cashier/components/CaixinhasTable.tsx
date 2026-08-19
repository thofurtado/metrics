'use client'
import { Heart, User } from 'lucide-react'

// Adicionamos um valor padrão [] para evitar o erro de undefined
export function CaixinhasTable({ lancamentos = [] }: { lancamentos?: any[] }) {
  // Garantimos que lancamentos seja um array antes de filtrar
  const listaSegura = Array.isArray(lancamentos) ? lancamentos : []

  const caixinhas = listaSegura.filter((l) => l && l.valorCaixinha > 0)
  const totalGeral = caixinhas.reduce(
    (acc, l) => acc + (l.valorCaixinha || 0),
    0,
  )

  if (caixinhas.length === 0) return null

  return (
    <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-pink-100 bg-white shadow-sm dark:border-pink-950/40 dark:bg-zinc-950 md:rounded-3xl">
      <div className="flex items-center justify-between border-b border-pink-100 bg-pink-50 px-6 py-4 dark:border-pink-950/50 dark:bg-pink-950/30">
        <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-pink-600">
          <Heart size={14} fill="currentColor" /> Controle de Caixinhas
        </h3>
        <span className="rounded-full bg-pink-600 px-3 py-1 font-mono text-xs font-black text-white">
          Total: R$ {totalGeral.toFixed(2)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="bg-zinc-50 text-[9px] font-black uppercase text-zinc-400 dark:bg-zinc-900/80 dark:text-zinc-400">
            <tr>
              <th className="px-6 py-3">Mesa</th>
              <th className="px-6 py-3">Venda Total</th>
              <th className="px-6 py-3 text-pink-600">Caixinha</th>
              <th className="px-6 py-3">Para Quem?</th>
              <th className="px-6 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {caixinhas.map((l, i) => (
              <tr
                key={l.id || i}
                className="text-xs font-bold text-zinc-600 transition-colors hover:bg-pink-50/30 dark:text-zinc-300 dark:hover:bg-pink-950/20"
              >
                <td className="px-6 py-3">#{l.mesa || '--'}</td>
                <td className="px-6 py-3 font-mono italic text-zinc-400">
                  R$ {l.valor.toFixed(2)}
                </td>
                <td className="px-6 py-3 font-mono font-black text-pink-600">
                  R$ {l.valorCaixinha.toFixed(2)}
                </td>
                <td className="flex items-center gap-2 px-6 py-3 text-[10px] uppercase">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-950/60">
                    <User size={10} className="text-pink-500" />
                  </div>
                  {l.paraQuem || 'Geral'}
                </td>
                <td className="px-6 py-3 text-right text-[9px] uppercase text-zinc-300">
                  {l.formaPagamento}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
