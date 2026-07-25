'use client'
import {
  Banknote,
  Check,
  CreditCard,
  Edit2,
  Heart,
  Landmark,
  Minus,
  Smartphone,
  Ticket,
  X,
  TrendingUp,
  ArrowDownRight,
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

  // Totais consolidados de maquininhas
  const totalMaquininhas = bancosComValor.reduce((acc, b) => acc + safeGet(resumo, `${b}.total`), 0)
  const totalJuros = bancosComValor.reduce((acc, b) => acc + safeGet(resumo, `${b}.juros`), 0)

  return (
    <div className="space-y-3">
      {/* ── LINHA 1: 4 CARDS PRINCIPAIS ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">

        {/* CARD 1: RESUMO GERAL (unificado) */}
        {(() => {
          // Separar operacional de a prazo dentro de CASA
          const padraoAPrazo = ['funcionario', 'permuta', 'a prazo']
          const normalizeStr = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
          const totalOperacional = identificadoresCasa.reduce((acc, forma) => {
            const isAPrazo = padraoAPrazo.some(p => normalizeStr(forma).includes(p))
            return acc + (isAPrazo ? 0 : safeGet(resumo, `CASA.${forma}`))
          }, 0)
          const vendasLiquidasCalc = totalEntradas - totalOperacional - saidasDinheiro - totalCaixinha

          return (
            <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/20">
              <Banknote size={34} className="absolute -right-1 -top-1 rotate-12 text-blue-500 opacity-10" />
              <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">
                Total Geral
              </p>
              <p className="text-xl font-black tracking-tight text-blue-900 dark:text-blue-200">
                R$ {totalEntradas.toFixed(2)}
              </p>

              <div className="mt-3 space-y-1 border-t border-blue-200/60 pt-2 dark:border-blue-800/40">
                {totalOperacional > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Minus size={8} /> Consumo Interno
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {totalOperacional.toFixed(2)}
                    </span>
                  </div>
                )}
                {saidasDinheiro > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-medium text-red-500">
                      <Minus size={8} /> Sangrias
                    </span>
                    <span className="font-mono font-bold text-red-500">
                      {saidasDinheiro.toFixed(2)}
                    </span>
                  </div>
                )}
                {totalCaixinha > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-medium text-pink-500">
                      <Minus size={8} /> Gorjetas
                    </span>
                    <span className="font-mono font-bold text-pink-500">
                      {totalCaixinha.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 font-black uppercase text-emerald-700 dark:text-emerald-400">
                    <Equal size={8} /> Venda Líquida
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                    R$ {vendasLiquidasCalc.toFixed(2)}
                  </span>
                </div>
              </div>

              {totalCaixinha > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-blue-200/60 pt-2 dark:border-blue-800/40">
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase text-pink-600">
                    <Heart size={8} fill="currentColor" /> Gorjetas
                  </span>
                  <span className="font-mono text-xs font-black text-pink-600">
                    R$ {totalCaixinha.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )
        })()}

        {/* CARD 2: DINHEIRO (ESPÉCIE) */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm dark:border-emerald-950/40 dark:bg-slate-950">
          <Banknote size={34} className="absolute -right-1 -top-1 rotate-12 text-emerald-500 opacity-8" />
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Banknote size={12} className="text-emerald-600" /> Dinheiro (Espécie)
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

        {/* CARD 3: SUBTOTAL CARTÕES / PIX */}
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
              <div className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2 dark:border-slate-900">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400">Total (Bruto)</span>
                  <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                    R$ {totalMaquininhas.toFixed(2)}
                  </span>
                </div>
                {totalJuros > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-red-400">Taxas Aprox.</span>
                    <span className="font-mono text-[10px] font-black text-red-500">
                      - R$ {totalJuros.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: CONSUMO INTERNO */}
        {temConsumoInterno ? (
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
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/30">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="text-sm">🔄</span>
              <h2 className="text-[10px] font-black uppercase tracking-wider italic text-slate-400">
                Consumo Interno
              </h2>
            </div>
            <p className="text-[11px] italic text-slate-400">Nenhum lançamento</p>
          </div>
        )}
      </div>

      {/* ── LINHA 2: CARDS POR MAQUININHA ── */}
      {bancosComValor.length > 0 && (
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
          bancosComValor.length >= 4
            ? 'md:grid-cols-4'
            : bancosComValor.length === 3
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2'
        }`}>
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
        </div>
      )}
    </div>
  )
}
