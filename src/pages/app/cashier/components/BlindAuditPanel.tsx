import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck,
  Lock,
  Printer,
  QrCode,
  Save,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { cn } from '@/lib/utils'

interface BlindAuditPanelProps {
  loteAtivo: any
  resumoLote: any
  onConfirmarFechamento?: () => void
  isAdmin?: boolean
}

export function BlindAuditPanel({
  loteAtivo,
  resumoLote,
  onConfirmarFechamento,
  isAdmin = true,
}: BlindAuditPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [observacaoGerente, setObservacaoGerente] = useState('')

  // Valores contados / declarados pelo operador
  const [declaredCash, setDeclaredCash] = useState<number>(0)
  const [declaredCoins, setDeclaredCoins] = useState<number>(0)
  const [declaredDebit, setDeclaredDebit] = useState<number>(0)
  const [declaredCredit, setDeclaredCredit] = useState<number>(0)
  const [declaredPix, setDeclaredPix] = useState<number>(0)

  // Cálculos apurados pelo sistema a partir dos lançamentos reais
  const sistemaEsperado = useMemo(() => {
    const lancamentos = loteAtivo?.lancamentos || []
    const saldoAbertura = Number(loteAtivo?.valorAbertura || 0)

    let vendasDinheiro = 0
    let vendasDebito = 0
    let vendasCredito = 0
    let vendasPix = 0
    let sangrias = 0
    let suprimentos = 0

    for (const l of lancamentos) {
      const val = Number(l.valor || 0)
      const forma = (l.formaPagamento || '').toLowerCase()

      if (l.isSaida) {
        sangrias += val
      } else if (l.isSuprimento) {
        suprimentos += val
      } else {
        if (forma.includes('dinheiro')) {
          vendasDinheiro += val
        } else if (forma.includes('dÃ©bito') || forma.includes('debito')) {
          vendasDebito += val
        } else if (forma.includes('crÃ©dito') || forma.includes('credito')) {
          vendasCredito += val
        } else if (forma.includes('pix')) {
          vendasPix += val
        } else {
          vendasDinheiro += val
        }
      }
    }

    const gavetaDinheiroEsperada = saldoAbertura + vendasDinheiro + suprimentos - sangrias
    const totalEsperado = gavetaDinheiroEsperada + vendasDebito + vendasCredito + vendasPix

    return {
      saldoAbertura,
      vendasDinheiro,
      vendasDebito,
      vendasCredito,
      vendasPix,
      sangrias,
      suprimentos,
      gavetaDinheiroEsperada,
      totalEsperado,
    }
  }, [loteAtivo])

  // Valores totais declarados
  const totalGavetaDeclarada = declaredCash + declaredCoins
  const totalDeclarado = totalGavetaDeclarada + declaredDebit + declaredCredit + declaredPix

  // Divergências
  const diferencaDinheiro = totalGavetaDeclarada - sistemaEsperado.gavetaDinheiroEsperada
  const diferencaDebito = declaredDebit - sistemaEsperado.vendasDebito
  const diferencaCredito = declaredCredit - sistemaEsperado.vendasCredito
  const diferencaPix = declaredPix - sistemaEsperado.vendasPix
  const diferencaTotal = totalDeclarado - sistemaEsperado.totalEsperado

  const temDivergencia = Math.abs(diferencaTotal) > 0.05

  return (
    <div className="overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900">
      {/* Header do Painel */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex cursor-pointer items-center justify-between border-b border-blue-100 bg-blue-50/60 px-6 py-4 transition-colors hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Painel de Auditoria Cega (Blind Checkout)
              </h3>
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-100/50 text-[10px] font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
              >
                Conciliação Físico vs. Fiscal
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confronto entre a contagem às cegas informada pelo operador e os registros automáticos do sistema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-bold text-slate-500"
          >
            {isExpanded ? (
              <>
                Recolher <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Expandir <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6 p-6">
          {/* Grid de 3 Colunas: Declarado vs Esperado vs Diferença */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Coluna 1: Declarado pelo Operador (4 colunas) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  Declarado pelo Operador
                </span>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  Físico Informado
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Banknote className="h-3.5 w-3.5" /> Dinheiro (Cédulas)
                  </span>
                  <CurrencyInput
                    value={declaredCash}
                    onValueChange={(v) => setDeclaredCash(Number(v || 0))}
                    className="h-8 w-28 text-right font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Coins className="h-3.5 w-3.5" /> Moedas
                  </span>
                  <CurrencyInput
                    value={declaredCoins}
                    onValueChange={(v) => setDeclaredCoins(Number(v || 0))}
                    className="h-8 w-28 text-right font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <CreditCard className="h-3.5 w-3.5" /> Comprovantes Débito
                  </span>
                  <CurrencyInput
                    value={declaredDebit}
                    onValueChange={(v) => setDeclaredDebit(Number(v || 0))}
                    className="h-8 w-28 text-right font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <CreditCard className="h-3.5 w-3.5" /> Comprovantes Crédito
                  </span>
                  <CurrencyInput
                    value={declaredCredit}
                    onValueChange={(v) => setDeclaredCredit(Number(v || 0))}
                    className="h-8 w-28 text-right font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500">
                    <QrCode className="h-3.5 w-3.5" /> PIX / Carteira Digital
                  </span>
                  <CurrencyInput
                    value={declaredPix}
                    onValueChange={(v) => setDeclaredPix(Number(v || 0))}
                    className="h-8 w-28 text-right font-mono font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Declarado</span>
                  <div className="text-lg font-mono font-black text-blue-600 dark:text-blue-400">
                    R$ {totalDeclarado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">Cédulas + Moedas + TEF</span>
              </div>
            </div>

            {/* Coluna 2: Calculado pelo Sistema (4 colunas) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Calculado pelo Sistema
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Extrato do PDV
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>+ Saldo Inicial (Troco)</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.saldoAbertura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>+ Vendas em Dinheiro</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.vendasDinheiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>+ Cartões Débito</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.vendasDebito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>+ Cartões Crédito</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.vendasCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>+ Vendas PIX Sistema</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.vendasPix.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {sistemaEsperado.sangrias > 0 && (
                  <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-bold">
                    <span>- Sangrias Caixa (Retiradas)</span>
                    <strong className="font-mono">
                      - R$ {sistemaEsperado.sangrias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Esperado</span>
                  <div className="text-lg font-mono font-black text-slate-900 dark:text-slate-100">
                    R$ {sistemaEsperado.totalEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">
                  Gaveta: R$ {sistemaEsperado.gavetaDinheiroEsperada.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Coluna 3: Diferença / Quebra (4 colunas) */}
            <div
              className={cn(
                "rounded-2xl border p-4.5 shadow-sm lg:col-span-4 space-y-3.5",
                temDivergencia
                  ? "border-red-200 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20"
                  : "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
              )}
            >
              <div className="flex items-center justify-between border-b pb-2.5 border-slate-200/60 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {temDivergencia ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  Diferença / Quebra
                </span>
                <Badge
                  variant={temDivergencia ? "destructive" : "secondary"}
                  className="text-[10px] font-bold"
                >
                  {temDivergencia ? "Alerta Gerencial" : "Caixa Conciliado"}
                </Badge>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Divergência Apurada
                </span>
                <div
                  className={cn(
                    "text-2xl font-mono font-black",
                    diferencaTotal < -0.05
                      ? "text-red-600"
                      : diferencaTotal > 0.05
                        ? "text-amber-600"
                        : "text-emerald-600"
                  )}
                >
                  {diferencaTotal >= 0 ? "+ " : ""}
                  R$ {diferencaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="ml-2 text-xs font-sans font-bold">
                    {diferencaTotal < -0.05
                      ? "(Falta de Caixa)"
                      : diferencaTotal > 0.05
                        ? "(Sobra de Caixa)"
                        : "(Sem Diferença)"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {diferencaDinheiro !== 0
                    ? `Diferença em dinheiro físico: R$ ${diferencaDinheiro.toFixed(2)}.`
                    : "Dinheiro físico bateu com perfeição."}
                </p>
              </div>

              <div className="rounded-xl bg-white/80 p-3 text-xs space-y-1.5 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gaveta Dinheiro Esperada:</span>
                  <span className="font-mono font-bold">
                    R$ {sistemaEsperado.gavetaDinheiroEsperada.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gaveta Dinheiro Contada:</span>
                  <span className="font-mono font-bold">
                    R$ {totalGavetaDeclarada.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1 border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Auditoria Cartão & PIX:</span>
                  <span className={Math.abs(diferencaDebito + diferencaCredito + diferencaPix) < 0.05 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                    {Math.abs(diferencaDebito + diferencaCredito + diferencaPix) < 0.05 ? "100% Conciliado" : "Divergência eletrônica"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Parecer / Observação do Gerente */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Parecer / Observação da Auditoria de Caixa
            </label>
            <input
              type="text"
              placeholder="Ex: Diferença de R$ 40,00 constatada na contagem física. Vendas eletrônicas conferidas com sucesso."
              value={observacaoGerente}
              onChange={(e) => setObservacaoGerente(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Auditoria vinculada à sessão de caixa
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toast.success('Auditoria salva com sucesso!')}
                  className="rounded-xl font-bold"
                >
                  <Save className="mr-1 h-3.5 w-3.5" /> Salvar Auditoria
                </Button>
                {onConfirmarFechamento && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onConfirmarFechamento}
                    className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Confirmar Fechamento do Caixa
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
