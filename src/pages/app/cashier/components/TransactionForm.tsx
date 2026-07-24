'use client'
import {
  ArrowLeft,
  CheckCircle2,
  Heart,
  Plus,
  TrendingDown,
  User,
  UserCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function TransactionForm({ onAdd }: { onAdd: (dados: any) => void }) {
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada')
  const [valor, setValor] = useState('')
  const [valorCaixinha, setValorCaixinha] = useState('')
  const [paraQuem, setParaQuem] = useState('')
  const [forma, setForma] = useState('Dinheiro')
  const [banco, setBanco] = useState('CAIXA')
  const [mesa, setMesa] = useState('')
  const [identificacao, setIdentificacao] = useState('')
  const [consumidorCasa, setConsumidorCasa] = useState('')
  const [isCaixinha, setIsCaixinha] = useState(false)

  const [showTooltip, setShowTooltip] = useState(false)
  const valorInputRef = useRef<HTMLInputElement>(null)

  const formasContaCasa = ['Funcionário', 'Pró-labore', 'Cortesia', 'Permuta']
  const formasEletronicas = ['PIX', 'Débito', 'Crédito', 'Voucher']
  const isContaCasa = formasContaCasa.includes(forma) && tipo === 'entrada'

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '')
    const amount = Number(digits) / 100
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const parseCurrencyToFloat = (value: string) => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
  }

  useEffect(() => {
    if (tipo === 'entrada') {
      if (forma === 'Dinheiro') setBanco('CAIXA')
      else if (formasContaCasa.includes(forma)) setBanco('CONTA DA CASA')
      else if (formasEletronicas.includes(forma)) {
        if (banco === 'CAIXA' || banco === 'CONTA DA CASA') setBanco('SAFRA')
      }
    } else {
      setBanco('CAIXA')
    }
  }, [forma, tipo])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valorNumerico = parseCurrencyToFloat(valor)
    if (valorNumerico <= 0) return

    onAdd({
      valor: valorNumerico,
      valorCaixinha: isCaixinha ? parseCurrencyToFloat(valorCaixinha) : 0,
      paraQuem: isCaixinha ? paraQuem : '',
      formaPagamento: tipo === 'saida' ? 'Sangria' : forma,
      banco,
      mesa: tipo === 'saida' ? '' : mesa,
      identificacao: tipo === 'saida' ? identificacao : '',
      consumidorCasa: isContaCasa ? consumidorCasa : '',
      isCaixinha: tipo === 'saida' ? false : isCaixinha,
      isSaida: tipo === 'saida',
    })

    setValor('')
    setValorCaixinha('')
    setParaQuem('')
    setMesa('')
    setIdentificacao('')
    setConsumidorCasa('')
    setIsCaixinha(false)

    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
    valorInputRef.current?.focus()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-start justify-between gap-3 px-1 sm:flex-row sm:items-center">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          {tipo === 'entrada' ? 'Lançar Venda' : 'Lançar Sangria'}
        </h2>
        <button
          type="button"
          onClick={() => setTipo(tipo === 'entrada' ? 'saida' : 'entrada')}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 text-[10px] font-black uppercase transition-all sm:w-auto ${
            tipo === 'saida'
              ? 'border-zinc-200 bg-zinc-100 text-zinc-600'
              : 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          {tipo === 'entrada' ? (
            <>
              <TrendingDown size={14} /> Registrar Sangria
            </>
          ) : (
            <>
              <ArrowLeft size={14} /> Voltar para Vendas
            </>
          )}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`relative flex flex-col rounded-[1.5rem] border p-4 shadow-sm transition-colors md:rounded-3xl md:p-5 ${tipo === 'saida' ? 'border-red-100 bg-red-50/30' : 'border-zinc-200 bg-white'}`}
      >
        {showTooltip && (
          <div className="absolute -top-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-[10px] font-black uppercase text-white shadow-xl duration-300 animate-in zoom-in">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <CheckCircle2 size={12} /> Lançamento Realizado!
            </span>
          </div>
        )}

        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-end">
          <div className="grid flex-1 grid-cols-2 gap-4 md:flex md:flex-row">
            <div className="col-span-1 md:w-32">
              <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                Valor Total
              </label>
              <input
                ref={valorInputRef}
                type="text"
                inputMode="numeric"
                required
                value={valor}
                onChange={(e) => setValor(formatCurrency(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 md:p-3 md:text-sm"
              />
            </div>

            {tipo === 'entrada' ? (
              <>
                <div className="col-span-1 md:w-24">
                  <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                    Mesa
                  </label>
                  <input
                    type="number"
                    value={mesa}
                    onChange={(e) => setMesa(e.target.value)}
                    placeholder="Nº"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-base font-bold outline-none focus:ring-2 focus:ring-blue-500 md:p-3 md:text-sm"
                  />
                </div>
                <div className="col-span-2 md:w-44">
                  <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                    Forma de Pagamento
                  </label>
                  <select
                    value={forma}
                    onChange={(e) => setForma(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-base font-bold outline-none md:p-3 md:text-sm"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Voucher">Voucher</option>
                    <option value="Funcionário">Funcionário</option>
                    <option value="Pró-labore">Pró-labore</option>
                    <option value="Cortesia">Cortesia</option>
                    <option value="Permuta">Permuta</option>
                  </select>
                </div>

                {isContaCasa && (
                  <div className="col-span-2 animate-in slide-in-from-left-2 md:flex-1">
                    <label className="mb-1 ml-1 block flex items-center gap-1 text-[9px] font-black uppercase text-orange-500">
                      <UserCircle size={10} /> Nome do Consumidor
                    </label>
                    <input
                      type="text"
                      required
                      value={consumidorCasa}
                      onChange={(e) => setConsumidorCasa(e.target.value)}
                      placeholder="Quem consumiu?"
                      className="w-full rounded-xl border-2 border-orange-200 bg-orange-50/30 p-4 text-base font-bold text-orange-700 outline-none focus:ring-2 focus:ring-orange-500 md:p-3 md:text-sm"
                    />
                  </div>
                )}

                {!isContaCasa && (
                  <div className="col-span-2 md:w-40">
                    <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                      Banco / Destino
                    </label>
                    <select
                      disabled={forma === 'Dinheiro'}
                      value={banco}
                      onChange={(e) => setBanco(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 text-base font-bold outline-none disabled:opacity-60 md:p-3 md:text-sm"
                    >
                      {forma === 'Dinheiro' ? (
                        <option value="CAIXA">CAIXA</option>
                      ) : (
                        <>
                          <option value="SAFRA">SAFRA</option>
                          <option value="PAGBANK">PAGBANK</option>
                          <option value="CIELO">CIELO</option>
                          <option value="IFOOD">IFOOD</option>
                          <option value="STONE">STONE</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-2 flex-1">
                <label className="mb-1 ml-1 block text-[9px] font-black uppercase text-zinc-400">
                  Motivo / Identificação
                </label>
                <input
                  type="text"
                  required
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                  placeholder="Ex: Gás, Limpeza, etc."
                  className="w-full rounded-xl border border-red-200 bg-red-50/50 p-4 text-base font-bold outline-none focus:ring-2 focus:ring-red-500 md:p-3 md:text-sm"
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-col items-center gap-4 md:mt-0 md:flex-row">
            {tipo === 'entrada' && (
              <label
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 transition-all md:w-auto ${isCaixinha ? 'border-pink-200 bg-pink-50' : 'border-zinc-100 bg-zinc-50'}`}
              >
                <input
                  type="checkbox"
                  checked={isCaixinha}
                  onChange={(e) => setIsCaixinha(e.target.checked)}
                  className="h-5 w-5 rounded-lg text-pink-600 focus:ring-0"
                />
                <span
                  className={`text-[10px] font-black uppercase ${isCaixinha ? 'text-pink-600' : 'text-zinc-600'}`}
                >
                  Caixinha?
                </span>
              </label>
            )}
            <button
              type="submit"
              className={`flex h-auto w-full items-center justify-center gap-2 rounded-xl px-10 py-5 text-xs font-black uppercase text-white shadow-lg transition-all active:scale-95 md:h-[46px] md:w-auto md:py-3 md:text-[10px] ${tipo === 'saida' ? 'bg-red-600' : 'bg-zinc-900'}`}
            >
              <Plus size={18} />{' '}
              {tipo === 'saida' ? 'Lançar Sangria' : 'Adicionar'}
            </button>
          </div>
        </div>

        {tipo === 'entrada' && isCaixinha && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-dashed border-pink-100 pt-4 animate-in fade-in slide-in-from-top-2 md:grid-cols-3">
            <div>
              <label className="mb-1 ml-1 block flex items-center gap-1 text-[9px] font-black uppercase text-pink-500">
                <Heart size={8} fill="currentColor" /> Valor Gorjeta
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={valorCaixinha}
                onChange={(e) =>
                  setValorCaixinha(formatCurrency(e.target.value))
                }
                placeholder="0,00"
                className="w-full rounded-xl border-2 border-pink-200 bg-white p-3 text-sm font-black text-pink-700 outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 ml-1 block flex items-center gap-1 text-[9px] font-black uppercase text-zinc-400">
                <User size={8} /> Para quem é a caixinha?
              </label>
              <input
                type="text"
                value={paraQuem}
                onChange={(e) => setParaQuem(e.target.value)}
                placeholder="Ex: João, Cozinha, Garçons..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
