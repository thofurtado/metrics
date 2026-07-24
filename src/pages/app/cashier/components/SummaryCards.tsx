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

  // Extrai dinamicamente todas as chaves de Bancos/Maquininhas do objeto resumo
  const bancosDinamicos = useMemo(() => {
    if (!resumo) return []
    const ignorados = ['GERAL', 'CAIXA', 'CASA']
    return Object.keys(resumo).filter((key) => !ignorados.includes(key))
  }, [resumo])

  // Extrai dinamicamente todas as chaves de Consumo Interno / Identificadores do objeto resumo.CASA
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
    <div className="space-y-6">
      <div className="rounded-[2.5rem] border border-slate-200 bg-slate-50 p-8 shadow-sm md:p-10">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-12 md:gap-16">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">
                Vendas Líquidas
              </p>
              <p className="text-4xl font-black tracking-tighter text-emerald-600 md:text-2xl">
                R$ {vendasLiquidas.toFixed(2)}
              </p>
            </div>

            <div className="hidden h-16 w-[2px] bg-slate-200 lg:block" />

            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-pink-500">
                <Heart size={14} fill="currentColor" /> Caixinhas
              </p>
              <p className="text-3xl font-black text-pink-600 md:text-2xl">
                R$ {totalCaixinha.toFixed(2)}
              </p>
            </div>

            <div className="hidden h-16 w-[2px] bg-slate-200 lg:block" />

            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-blue-500">
                Total Geral em Caixa
              </p>
              <p className="text-4xl font-black tracking-tighter text-slate-900 md:text-2xl">
                R$ {totalGeralEmCaixa.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-6 border-t border-slate-200 pt-8 lg:w-auto lg:gap-10 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <div className="flex flex-col">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <Smartphone size={14} /> Pix
              </span>
              <span className="font-mono text-xl font-black text-blue-600">
                {totalPorForma('PIX').toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <CreditCard size={14} /> Débito
              </span>
              <span className="font-mono text-xl font-black text-slate-600">
                {totalPorForma('Débito').toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                <CreditCard size={14} /> Crédito
              </span>
              <span className="font-mono text-xl font-black text-slate-600">
                {totalPorForma('Crédito').toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-purple-500">
                <Ticket size={14} /> Voucher
              </span>
              <span className="font-mono text-xl font-black text-purple-600">
                {totalPorForma('Voucher').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* CARD DINHEIRO (ESPÉCIE) */}
        <div className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <Banknote
            size={40}
            className="absolute -right-2 -top-2 rotate-12 text-emerald-600 opacity-10"
          />
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-tight text-emerald-700">
            Dinheiro (Espécie)
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold italic text-emerald-800">
              <span className="underline decoration-emerald-200">Abertura</span>
              {isEditing ? (
                <div className="flex items-center gap-1 rounded border border-emerald-200 bg-white p-1 shadow-inner">
                  <input
                    type="number"
                    value={tempAbertura}
                    onChange={(e) => setTempAbertura(e.target.value)}
                    className="w-16 bg-transparent font-mono text-emerald-900 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    className="text-emerald-600 hover:text-emerald-800"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="group/btn flex cursor-pointer items-center gap-1"
                  onClick={handleStartEdit}
                >
                  <span>{abertura.toFixed(2)}</span>
                  <Edit2
                    size={10}
                    className="text-emerald-600 opacity-0 group-hover/btn:opacity-100"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs font-medium text-emerald-800/60">
              <span>Vendas</span>
              <span>{entradasDinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-red-500">
              <span>Saídas</span>
              <span>-{saidasDinheiro.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-3">
              <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-600">
                Saldo Físico
              </span>
              <span className="font-mono text-lg font-black text-emerald-700">
                {saldoFinalDinheiro.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CARDS DINÂMICOS DE BANCOS E MAQUINAS */}
        {bancosDinamicos.map((banco) => (
          <div
            key={banco}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-tight text-slate-400">
              <Landmark size={14} className="text-blue-500" /> {banco}
            </h2>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Pix</span>
                <span className="font-mono font-bold text-slate-900">
                  {safeGet(resumo, `${banco}.PIX`).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Débito</span>
                <span className="font-mono font-bold text-slate-900">
                  {safeGet(resumo, `${banco}.Débito`).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Crédito</span>
                <span className="font-mono font-bold text-slate-900">
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
                  <span>{safeGet(resumo, `${banco}.caixinha`).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] font-black uppercase text-slate-300">
                  Líquido
                </span>
                <span className="font-mono text-lg font-black text-blue-600">
                  {safeGet(resumo, `${banco}.total`).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* CARD DINÂMICO DE CONSUMO INTERNO / IDENTIFICADORES */}
        <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 shadow-inner">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-black uppercase italic tracking-tight text-orange-600">
            Consumo Interno
          </h2>
          <div className="space-y-1.5 text-xs">
            {identificadoresCasa.map((forma) => (
              <div
                key={forma}
                className="flex justify-between font-bold text-slate-500"
              >
                <span>{forma}</span>
                <span className="font-mono text-slate-700">
                  {safeGet(resumo, `CASA.${forma}`).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3 text-orange-600">
              <span className="text-[10px] font-black uppercase italic">
                Total
              </span>
              <span className="font-mono text-lg font-black italic">
                {safeGet(resumo, 'CASA.total').toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
