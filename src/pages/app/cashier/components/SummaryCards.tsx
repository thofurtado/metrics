'use client'
import {
  Banknote,
  Check,
  CreditCard,
  Edit2,
  Heart,
  Landmark,
  Smartphone,
  Ticket,
  X,
  TrendingUp,
  ArrowDownRight,
  Minus,
  Equal,
} from 'lucide-react'
import { useMemo, useState } from 'react'

export function SummaryCards({
  resumo,
  onEditAbertura,
}: {
  resumo: any
  onEditAbertura?: (valor: number) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempAbertura, setTempAbertura] = useState('')

  const safeGet = (obj: any, path: string) => {
    const value = path.split('.').reduce((acc, part) => acc && acc[part], obj)
    return typeof value === 'number' ? value : 0
  }

  const totalCaixinha = safeGet(resumo, 'GERAL.totalCaixinha')
  const abertura = safeGet(resumo, 'CAIXA.saldoAbertura')
  const entradasDinheiro = safeGet(resumo, 'CAIXA.entradasDinheiro')
  const saidasDinheiro = safeGet(resumo, 'CAIXA.totalSaidas')

  const bancosDinamicos = useMemo(() => {
    if (!resumo) return []
    const ignorados = ['GERAL', 'CAIXA', 'CASA']
    return Object.keys(resumo).filter((key) => !ignorados.includes(key))
  }, [resumo])

  const identificadoresCasa = useMemo(() => {
    if (!resumo || !resumo.CASA) return []
    return Object.keys(resumo.CASA).filter((key) => key !== 'total')
  }, [resumo])

  const totalPorForma = (forma: string) => {
    return bancosDinamicos.reduce(
      (acc, banco) => acc + safeGet(resumo, `${banco}.${forma}`),
      0,
    )
  }

  const totalCasa = safeGet(resumo, 'CASA.total')
  const totalEntradas = safeGet(resumo, 'GERAL.entradas')

  const { vendasLiquidas, totalGeralEmCaixa } = useMemo(() => {
    const vLiquidas = totalEntradas - totalCasa
    const tGeral = abertura + safeGet(resumo, 'GERAL.saldo') - totalCasa
    return { vendasLiquidas: vLiquidas, totalGeralEmCaixa: tGeral }
  }, [resumo, abertura, totalEntradas, totalCasa])

  const saldoFinalDinheiro = abertura + entradasDinheiro - saidasDinheiro

  const handleStartEdit = () => {
    setTempAbertura(abertura.toString())
    setIsEditing(true)
  }

  const handleSave = () => {
    const novoValor = parseFloat(tempAbertura)
    if (!isNaN(novoValor) && onEditAbertura) {
      onEditAbertura(novoValor)
    }
    setIsEditing(false)
  }

  const bancosComValor = bancosDinamicos.filter(b => safeGet(resumo, `${b}.total`) > 0)
  const temConsumoInterno = safeGet(resumo, 'CASA.total') > 0

  // Total de todas as maquininhas
  const totalMaquininhas = bancosComValor.reduce((acc, b) => acc + safeGet(resumo, `${b}.total`), 0)

  return (
    <div className="space-y-3">
      {/* ── HERO CARD: RESUMO FINANCEIRO UNIFICADO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 shadow-lg dark:border-slate-700">
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          {/* TOTAL GERAL EM CAIXA — destaque principal */}
          <div className="flex-1">
            <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400">
              <Banknote size={12} /> Total Geral em Caixa
            </p>
            <p className="text-3xl font-black tracking-tight text-white md:text-4xl">
              R$ {totalGeralEmCaixa.toFixed(2)}
            </p>
          </div>

          {/* BREAKDOWN — como se chega nas Vendas Líquidas */}
          <div className="flex flex-1 flex-col gap-1.5 rounded-xl bg-white/5 px-4 py-3 backdrop-blur-sm md:max-w-sm">
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
              Composição
            </p>

            {/* Total Entradas */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Total Entradas</span>
              <span className="font-mono font-bold text-white">R$ {totalEntradas.toFixed(2)}</span>
            </div>

            {/* − Consumo Interno */}
            {totalCasa > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Minus size={10} /> Consumo Interno
                </span>
                <span className="font-mono font-bold text-amber-400">
                  - R$ {totalCasa.toFixed(2)}
                </span>
              </div>
            )}

            {/* − Sangrias */}
            {saidasDinheiro > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 font-semibold text-red-400">
                  <Minus size={10} /> Sangrias
                </span>
                <span className="font-mono font-bold text-red-400">
                  - R$ {saidasDinheiro.toFixed(2)}
                </span>
              </div>
            )}

            {/* ═ Vendas Líquidas */}
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <Equal size={10} /> Vendas Líquidas
              </span>
              <span className="font-mono text-sm font-black text-emerald-400">
                R$ {vendasLiquidas.toFixed(2)}
              </span>
            </div>
          </div>

          {/* CAIXINHAS — se houver */}
          {totalCaixinha > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-pink-500/10 px-4 py-3 md:flex-col md:items-start">
              <Heart size={14} className="text-pink-400" fill="currentColor" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-pink-400">Gorjetas</p>
                <p className="font-mono text-lg font-black text-pink-300">R$ {totalCaixinha.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── LINHA 2: TODOS OS DETALHAMENTOS EM UMA LINHA ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5">

        {/* CARD DINHEIRO (ESPÉCIE) */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-950/40 dark:bg-slate-950">
          <Banknote size={34} className="absolute -right-1 -top-1 rotate-12 text-emerald-500 opacity-8" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Banknote size={12} className="text-emerald-600" /> Dinheiro
            </h2>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] italic underline decoration-emerald-200">Abertura</span>
              {isEditing ? (
                <div className="flex items-center gap-1 rounded border border-emerald-200 bg-white p-0.5 shadow-inner dark:border-emerald-800 dark:bg-slate-900">
                  <input
                    type="number"
                    value={tempAbertura}
                    onChange={(e) => setTempAbertura(e.target.value)}
                    className="w-14 bg-transparent font-mono text-xs font-bold text-emerald-900 outline-none dark:text-emerald-100"
                    autoFocus
                  />
                  <button onClick={handleSave} className="text-emerald-600 hover:text-emerald-800">
                    <Check size={12} />
                  </button>
                  <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-600">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="group/btn flex cursor-pointer items-center gap-1" onClick={handleStartEdit}>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{abertura.toFixed(2)}</span>
                  <Edit2 size={10} className="text-emerald-500 opacity-0 group-hover/btn:opacity-100" />
                </div>
              )}
            </div>
            <div className="flex justify-between text-slate-500">
              <span>+ Vendas</span>
              <span className="font-mono font-bold text-emerald-700">{entradasDinheiro.toFixed(2)}</span>
            </div>
            {saidasDinheiro > 0 && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-red-500"><ArrowDownRight size={10} /> Sangrias</span>
                <span className="font-mono font-bold text-red-600">-{saidasDinheiro.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-emerald-100 pt-2 dark:border-emerald-900/40">
              <span className="text-[9px] font-black uppercase text-emerald-600">Saldo Físico</span>
              <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                R$ {saldoFinalDinheiro.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD SUBTOTAL CARTÕES/PIX */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center gap-1.5">
            <CreditCard size={12} className="text-indigo-500" />
            <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Cartões / PIX
            </h2>
          </div>
          <div className="space-y-1.5 text-[11px]">
            {totalPorForma('PIX') > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-bold text-teal-600"><Smartphone size={10} /> PIX</span>
                <span className="font-mono font-bold text-teal-700">R$ {totalPorForma('PIX').toFixed(2)}</span>
              </div>
            )}
            {totalPorForma('Débito') > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-bold text-blue-600"><CreditCard size={10} /> Débito</span>
                <span className="font-mono font-bold text-blue-700">R$ {totalPorForma('Débito').toFixed(2)}</span>
              </div>
            )}
            {totalPorForma('Crédito') > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-bold text-indigo-600"><CreditCard size={10} /> Crédito</span>
                <span className="font-mono font-bold text-indigo-700">R$ {totalPorForma('Crédito').toFixed(2)}</span>
              </div>
            )}
            {totalPorForma('Voucher') > 0 && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-bold text-purple-600"><Ticket size={10} /> Voucher</span>
                <span className="font-mono font-bold text-purple-700">R$ {totalPorForma('Voucher').toFixed(2)}</span>
              </div>
            )}
            {totalMaquininhas > 0 && (
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-900">
                <span className="text-[9px] font-black uppercase text-slate-400">Total</span>
                <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                  R$ {totalMaquininhas.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CARDS DINÂMICOS DE BANCOS E MAQUINAS */}
        {bancosComValor.map((banco) => (
          <div
            key={banco}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="mb-3 flex items-center gap-1.5">
              <Landmark size={12} className="text-blue-500" />
              <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {banco}
              </h2>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {safeGet(resumo, `${banco}.PIX`) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1"><Smartphone size={10} className="text-teal-500" /> PIX</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeGet(resumo, `${banco}.PIX`).toFixed(2)}
                  </span>
                </div>
              )}
              {safeGet(resumo, `${banco}.Débito`) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1"><CreditCard size={10} className="text-blue-500" /> Débito</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeGet(resumo, `${banco}.Débito`).toFixed(2)}
                  </span>
                </div>
              )}
              {safeGet(resumo, `${banco}.Crédito`) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1"><CreditCard size={10} className="text-indigo-500" /> Crédito</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeGet(resumo, `${banco}.Crédito`).toFixed(2)}
                  </span>
                </div>
              )}
              {safeGet(resumo, `${banco}.Voucher`) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1"><Ticket size={10} className="text-purple-500" /> Voucher</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {safeGet(resumo, `${banco}.Voucher`).toFixed(2)}
                  </span>
                </div>
              )}
              {safeGet(resumo, `${banco}.caixinha`) > 0 && (
                <div className="flex justify-between text-pink-500">
                  <span className="flex items-center gap-1"><Heart size={10} fill="currentColor" /> Gorjeta</span>
                  <span className="font-mono font-bold">{safeGet(resumo, `${banco}.caixinha`).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2 dark:border-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400">Total (Bruto)</span>
                  <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                    R$ {safeGet(resumo, `${banco}.total`).toFixed(2)}
                  </span>
                </div>
                {safeGet(resumo, `${banco}.juros`) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-red-400">Juros Aprox.</span>
                    <span className="font-mono text-[10px] font-black text-red-500">
                      - R$ {safeGet(resumo, `${banco}.juros`).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* CARD CONSUMO INTERNO */}
        {temConsumoInterno && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm dark:border-amber-950/40 dark:bg-amber-950/10">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="text-sm">🔄</span>
              <h2 className="text-[10px] font-black uppercase tracking-wider italic text-amber-700 dark:text-amber-400">
                Consumo Interno
              </h2>
            </div>
            <div className="space-y-1.5 text-[11px]">
              {identificadoresCasa
                .filter(forma => safeGet(resumo, `CASA.${forma}`) > 0)
                .map((forma) => (
                  <div key={forma} className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="truncate pr-2 font-medium">{forma}</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      {safeGet(resumo, `CASA.${forma}`).toFixed(2)}
                    </span>
                  </div>
                ))}
              <div className="mt-2 flex items-center justify-between border-t border-amber-200/60 pt-2 dark:border-amber-900/40">
                <span className="text-[9px] font-black uppercase italic text-amber-700">Total A Prazo</span>
                <span className="font-mono text-sm font-black italic text-amber-700 dark:text-amber-400">
                  R$ {safeGet(resumo, 'CASA.total').toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

