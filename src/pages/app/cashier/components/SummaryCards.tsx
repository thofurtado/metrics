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

  // Extrai dinamicamente todas as chaves de Bancos/Maquininhas
  const bancosDinamicos = useMemo(() => {
    if (!resumo) return []
    const ignorados = ['GERAL', 'CAIXA', 'CASA']
    return Object.keys(resumo).filter((key) => !ignorados.includes(key))
  }, [resumo])

  // Extrai dinamicamente todas as chaves de Consumo Interno / Identificadores
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

  const { vendasLiquidas, totalGeralEmCaixa } = useMemo(() => {
    const totalCasa = safeGet(resumo, 'CASA.total')
    const vLiquidas = safeGet(resumo, 'GERAL.entradas') - totalCasa
    const tGeral = abertura + safeGet(resumo, 'GERAL.saldo') - totalCasa

    return {
      vendasLiquidas: vLiquidas,
      totalGeralEmCaixa: tGeral,
    }
  }, [resumo, abertura])

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

  return (
    <div className="space-y-4">
      {/* PAINEL SUPERIOR ULTRAMODERNO E COMPACTO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* MÉTRICAS PRINCIPAIS INLINE */}
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Vendas Líquidas
              </p>
              <p className="text-2xl font-black tracking-tight text-emerald-600">
                R$ {vendasLiquidas.toFixed(2)}
              </p>
            </div>

            <div className="hidden h-9 w-[1px] bg-slate-200 dark:bg-slate-800 md:block" />

            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-500">
                <Heart size={12} fill="currentColor" /> Caixinhas
              </p>
              <p className="text-xl font-black text-pink-600">
                R$ {totalCaixinha.toFixed(2)}
              </p>
            </div>

            <div className="hidden h-9 w-[1px] bg-slate-200 dark:bg-slate-800 md:block" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                Total Geral em Caixa
              </p>
              <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                R$ {totalGeralEmCaixa.toFixed(2)}
              </p>
            </div>
          </div>

          {/* SUBTOTAL POR MODALIDADE INLINE COMPACTO */}
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-850 dark:bg-slate-900/60 lg:gap-6">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                <Smartphone size={12} /> Pix
              </span>
              <span className="font-mono text-sm font-black text-blue-600">
                {totalPorForma('PIX').toFixed(2)}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                <CreditCard size={12} /> Débito
              </span>
              <span className="font-mono text-sm font-black text-slate-700 dark:text-slate-300">
                {totalPorForma('Débito').toFixed(2)}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                <CreditCard size={12} /> Crédito
              </span>
              <span className="font-mono text-sm font-black text-slate-700 dark:text-slate-300">
                {totalPorForma('Crédito').toFixed(2)}
              </span>
            </div>

            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-purple-500">
                <Ticket size={12} /> Voucher
              </span>
              <span className="font-mono text-sm font-black text-purple-600">
                {totalPorForma('Voucher').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID DE CARDS DAS OPERADORAS / DINHEIRO / CONSUMO (UM AO LADO DO OUTRO) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* CARD DINHEIRO (ESPÉCIE) */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-950/40 dark:bg-emerald-950/20">
          <Banknote
            size={36}
            className="absolute -right-2 -top-2 rotate-12 text-emerald-600 opacity-10"
          />
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
            Dinheiro (Espécie)
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold italic text-emerald-800 dark:text-emerald-300">
              <span className="underline decoration-emerald-200 text-[11px]">Abertura</span>
              {isEditing ? (
                <div className="flex items-center gap-1 rounded border border-emerald-200 bg-white p-0.5 shadow-inner dark:border-emerald-800 dark:bg-slate-900">
                  <input
                    type="number"
                    value={tempAbertura}
                    onChange={(e) => setTempAbertura(e.target.value)}
                    className="w-14 bg-transparent font-mono text-xs font-bold text-emerald-900 outline-none dark:text-emerald-100"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div
                  className="group/btn flex cursor-pointer items-center gap-1"
                  onClick={handleStartEdit}
                >
                  <span className="font-mono text-xs">{abertura.toFixed(2)}</span>
                  <Edit2
                    size={10}
                    className="text-emerald-600 opacity-0 group-hover/btn:opacity-100"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between text-[11px] font-medium text-emerald-800/70 dark:text-emerald-300/70">
              <span>Vendas</span>
              <span className="font-mono font-bold">{entradasDinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-red-500">
              <span>Saídas</span>
              <span className="font-mono">-{saidasDinheiro.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-emerald-200/60 pt-2 dark:border-emerald-900/40">
              <span className="text-[9px] font-black uppercase text-emerald-600">
                Saldo Físico
              </span>
              <span className="font-mono text-base font-black text-emerald-700 dark:text-emerald-400">
                {saldoFinalDinheiro.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CARDS DINÂMICOS DE BANCOS E MAQUINAS */}
        {bancosDinamicos.map((banco) => (
          <div
            key={banco}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400">
              <Landmark size={13} className="text-blue-500" /> {banco}
            </h2>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Pix</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {safeGet(resumo, `${banco}.PIX`).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Débito</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {safeGet(resumo, `${banco}.Débito`).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Crédito</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {safeGet(resumo, `${banco}.Crédito`).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium text-purple-600">
                <span>Voucher</span>
                <span className="font-mono font-bold">
                  {safeGet(resumo, `${banco}.Voucher`).toFixed(2)}
                </span>
              </div>
              {safeGet(resumo, `${banco}.caixinha`) > 0 && (
                <div className="flex justify-between font-bold italic text-pink-500">
                  <span>Gorjeta</span>
                  <span className="font-mono">{safeGet(resumo, `${banco}.caixinha`).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-900">
                <span className="text-[9px] font-black uppercase text-slate-400">
                  Líquido
                </span>
                <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                  {safeGet(resumo, `${banco}.total`).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* CARD DINÂMICO DE CONSUMO INTERNO / IDENTIFICADORES */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-black uppercase italic tracking-tight text-orange-600">
            Consumo Interno
          </h2>
          <div className="space-y-1 text-[11px]">
            {identificadoresCasa.map((forma) => (
              <div
                key={forma}
                className="flex justify-between font-bold text-slate-500 dark:text-slate-400"
              >
                <span className="truncate pr-1">{forma}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {safeGet(resumo, `CASA.${forma}`).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-orange-600 dark:border-slate-800">
              <span className="text-[9px] font-black uppercase italic">
                Total
              </span>
              <span className="font-mono text-base font-black italic">
                {safeGet(resumo, 'CASA.total').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
