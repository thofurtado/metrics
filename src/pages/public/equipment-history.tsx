'use client'

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Monitor,
  Cpu,
  HardDrive,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Package,
  CreditCard,
  Building2,
  ChevronDown,
  User,
  ShieldCheck,
  FileText,
  MessageSquare,
  HelpCircle,
  Info
} from 'lucide-react'
import { useState } from 'react'

import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface TreatmentItem {
  id: string
  name: string
  type: 'product' | 'service'
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Interaction {
  id: string
  description: string
  authorName: string
  createdAt: string
}

interface PaymentInfo {
  id: string
  method: string
  amount: number
  occurrences: number
}

interface Treatment {
  id: string
  openingDate: string
  endingDate?: string | null
  request: string
  status: string
  observations?: string | null
  items: TreatmentItem[]
  totalAmount: number
  payments: PaymentInfo[]
  isPaid: boolean
  paidAt?: string | null
  interactions: Interaction[]
}

interface EquipmentData {
  id: string
  identification: string
  type: string
  brand: string
  details?: string | null
  createdAt: string
  clientName: string
  groupName?: string | null
  telemetry?: any
  totalTreatments: number
  treatments: Treatment[]
}

async function fetchEquipmentHistory(id: string): Promise<EquipmentData> {
  const currentHost = typeof window !== 'undefined' ? window.location.host : ''
  const response = await api.get(`/public/equipments/${id}/history`, {
    headers: {
      'x-tenant-domain': currentHost,
    },
  })
  return response.data.equipment
}

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function parseHardwareSpecs(equipment: EquipmentData) {
  const tel = equipment.telemetry || {}
  const details = (equipment.details || '').trim()

  // 1. Processador
  let cpu: string | null = null
  if (tel.cpu) {
    if (typeof tel.cpu === 'object') {
      cpu = tel.cpu.brand || tel.cpu.name || tel.cpu.model || null
    } else if (typeof tel.cpu === 'string' && tel.cpu !== '[object Object]' && tel.cpu.trim() !== '') {
      cpu = tel.cpu
    }
  } else if (tel.processor) {
    if (typeof tel.processor === 'object') {
      cpu = tel.processor.brand || tel.processor.name || null
    } else if (typeof tel.processor === 'string' && tel.processor !== '[object Object]') {
      cpu = tel.processor
    }
  }

  // 2. Memória RAM
  let ram: string | null = null
  if (tel.mem) {
    if (typeof tel.mem === 'object' && typeof tel.mem.total === 'number') {
      const gb = Math.round(tel.mem.total / (1024 * 1024 * 1024))
      if (gb > 0) ram = `${gb} GB RAM`
    } else if (typeof tel.mem === 'string' && tel.mem !== '[object Object]') {
      ram = tel.mem
    }
  } else if (tel.ram && typeof tel.ram === 'string') {
    ram = tel.ram
  }

  // 3. Armazenamento
  let disk: string | null = null
  if (Array.isArray(tel.fsSize) && tel.fsSize.length > 0) {
    const primary = tel.fsSize[0]
    const size = Math.round(primary.totalSizeGB || primary.size || 0)
    if (size > 0) {
      disk = `${size} GB SSD / HD`
    }
  } else if (tel.disk) {
    if (typeof tel.disk === 'object') {
      disk = tel.disk.size ? `${tel.disk.size} GB` : tel.disk.name || null
    } else if (typeof tel.disk === 'string' && tel.disk !== '[object Object]') {
      disk = tel.disk
    }
  }

  // 4. Sistema Operacional
  let os: string | null = null
  if (tel.os) {
    if (typeof tel.os === 'object') {
      os = tel.os.distro || tel.os.name || tel.os.release || null
    } else if (typeof tel.os === 'string' && tel.os !== '[object Object]') {
      os = tel.os
    }
  } else if (tel.system?.os) {
    os = String(tel.system.os)
  }

  return {
    cpu,
    ram,
    disk,
    os,
    hasAnySpec: Boolean(cpu || ram || disk || os),
    manualDetails: details || null,
  }
}

export function EquipmentHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [expandedTreatments, setExpandedTreatments] = useState<Record<string, boolean>>({})

  const toggleTreatment = (treatmentId: string) => {
    setExpandedTreatments((prev) => ({
      ...prev,
      [treatmentId]: prev[treatmentId] === undefined ? false : !prev[treatmentId],
    }))
  }

  const {
    data: equipment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['public-equipment-history', id],
    queryFn: () => fetchEquipmentHistory(id || ''),
    enabled: !!id,
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20" />
          <p className="text-sm font-semibold tracking-wide text-slate-400 animate-pulse">
            Carregando prontuário técnico do equipamento...
          </p>
        </div>
      </div>
    )
  }

  if (isError || !equipment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 text-center">
        <div className="max-w-md space-y-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-white">Equipamento Não Localizado</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            O identificador informado não corresponde a nenhum equipamento cadastrado no sistema ou o link foi digitado incorretamente.
          </p>
          <div className="pt-2">
            <Link to="/">
              <Button variant="outline" className="border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700">
                Ir para o Início
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const specs = parseHardwareSpecs(equipment)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white pb-16">
      {/* HEADER SUPERIOR BRANDING */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md shadow-indigo-500/20 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-indigo-400">METRICS TI</span>
              <h2 className="text-sm font-bold text-white">Prontuário Técnico</h2>
            </div>
          </div>

          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold text-[11px] px-2.5 py-1">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Equipamento Autenticado
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-6 space-y-6">
        {/* HERO CARD: ESPECIFICAÇÕES DO EQUIPAMENTO */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-0.5 rounded-lg shadow-sm">
                  {equipment.type || 'Computador'}
                </Badge>
                {equipment.brand && (
                  <Badge variant="outline" className="border-slate-700 bg-slate-800/80 text-slate-300 text-xs font-semibold px-2.5 py-0.5">
                    {equipment.brand}
                  </Badge>
                )}
                <span className="text-[11px] text-slate-400">Cadastrado em {formatDate(equipment.createdAt)}</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {equipment.identification}
              </h1>

              <div className="flex items-center gap-4 text-xs text-slate-300 pt-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="h-4 w-4 text-indigo-400" />
                  <span>{equipment.clientName}</span>
                </div>
                {equipment.groupName && (
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    <span>{equipment.groupName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* BADGE DE TOTAL DE ATENDIMENTOS */}
            <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-black text-white leading-none">{equipment.totalTreatments}</p>
                <p className="text-[11px] text-slate-400 font-medium">Ordens de Serviço</p>
              </div>
            </div>
          </div>

          {/* TELEMETRIA DE HARDWARE INTELIGENTE (EXIBE APENAS CARDS COM DADOS REAIS) */}
          {specs.hasAnySpec && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {specs.cpu && (
                <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl flex items-center gap-2.5">
                  <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Processador</p>
                    <p className="font-semibold text-slate-200 truncate" title={specs.cpu}>{specs.cpu}</p>
                  </div>
                </div>
              )}

              {specs.ram && (
                <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-blue-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Memória</p>
                    <p className="font-semibold text-slate-200 truncate" title={specs.ram}>{specs.ram}</p>
                  </div>
                </div>
              )}

              {specs.disk && (
                <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl flex items-center gap-2.5">
                  <HardDrive className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Armazenamento</p>
                    <p className="font-semibold text-slate-200 truncate" title={specs.disk}>{specs.disk}</p>
                  </div>
                </div>
              )}

              {specs.os && (
                <div className="bg-slate-950/60 border border-slate-800/60 p-3 rounded-xl flex items-center gap-2.5">
                  <Monitor className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sistema</p>
                    <p className="font-semibold text-slate-200 truncate" title={specs.os}>{specs.os}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DETALHES OU OBSERVAÇÕES MANUAIS CADASTRADAS */}
          {specs.manualDetails && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">Especificações / Detalhes: </span>
                <span>{specs.manualDetails}</span>
              </div>
            </div>
          )}
        </div>

        {/* TÍTULO DA SEÇÃO DE HISTÓRICO */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              Histórico Técnico Completo
            </h2>
            <p className="text-xs text-slate-400">
              Linha do tempo de intervenções, manutenções, peças e encerramentos
            </p>
          </div>
        </div>

        {/* LISTA DE ORDENS DE SERVIÇO */}
        {equipment.treatments.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40 text-center py-12 rounded-3xl">
            <CardContent className="space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum chamado registrado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Este equipamento não possui ordens de serviço anteriores registradas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {equipment.treatments.map((treatment, index) => {
              const isExpanded = expandedTreatments[treatment.id] !== undefined
                ? expandedTreatments[treatment.id]
                : index === 0

              const isFinished = treatment.status === 'finished' || treatment.status === 'concluded' || !!treatment.endingDate

              const badgeColor = isFinished
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'

              const iconBadgeColor = isFinished
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'

              // Obter a última interação se houver
              const allInteractions = treatment.interactions || []
              const hasInteractions = allInteractions.length > 0
              const lastInteraction = hasInteractions ? allInteractions[allInteractions.length - 1] : null
              const middleInteractions = isFinished && hasInteractions ? allInteractions.slice(0, -1) : allInteractions

              return (
                <div
                  key={treatment.id}
                  className="overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-900/50 backdrop-blur-lg transition-all duration-200 hover:border-slate-700"
                >
                  {/* BARRA SUPERIOR COLAPSÁVEL (CLICK TO EXPAND) */}
                  <button
                    type="button"
                    onClick={() => toggleTreatment(treatment.id)}
                    className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 text-left bg-slate-900/80 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={"flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm shrink-0 border " + iconBadgeColor}>
                        #{equipment.treatments.length - index}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-200">
                            {formatDate(treatment.openingDate)}
                          </span>
                          <span className="text-slate-600">•</span>
                          <Badge variant="outline" className={"text-[10px] font-bold uppercase px-2 py-0.5 " + badgeColor}>
                            {isFinished ? 'Concluído' : 'Em Andamento'}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-slate-400 line-clamp-1 mt-0.5">
                          {treatment.request}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs font-black text-white">{formatBRL(treatment.totalAmount)}</span>
                        <p className="text-[10px] text-slate-400">
                          {treatment.isPaid ? '✓ Quitado' : 'Pendente'}
                        </p>
                      </div>
                      <div
                        className={"flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-transform duration-200 " + (isExpanded ? "rotate-180 text-white bg-indigo-600" : "")}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* CONTEÚDO EXPANDIDO */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 space-y-6 border-t border-slate-800/80 bg-slate-950/40">
                      
                      {/* 1. MOTIVO DO CHAMADO (RELATO DO CLIENTE / ABERTURA) */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                          <HelpCircle className="h-4 w-4" />
                          <span>Motivo do Chamado</span>
                        </div>
                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                          {treatment.request}
                        </div>
                      </div>

                      {/* 2. LINHA DO TEMPO DA HISTÓRIA TÉCNICA (INTERAÇÕES + ENCERRAMENTO) */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <MessageSquare className="h-4 w-4 text-blue-400" />
                          <span>História do Atendimento</span>
                        </div>

                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                          {/* Interações técnicas intermediárias */}
                          {middleInteractions.map((inter, iIdx) => (
                            <div key={inter.id || iIdx} className="relative group">
                              <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 border-2 border-slate-950 text-indigo-400">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                              </div>
                              <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span className="font-bold text-slate-300">{inter.authorName}</span>
                                  <span>{formatDateTime(inter.createdAt)}</span>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed">
                                  {inter.description || 'Interação registrada no chamado.'}
                                </p>
                              </div>
                            </div>
                          ))}

                          {/* Se a O.S. estiver finalizada: Encerramento com a última interação */}
                          {isFinished && (
                            <div className="relative group">
                              <div className="absolute -left-6 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 border-2 border-slate-950 text-white shadow-md shadow-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-black text-emerald-400 uppercase tracking-wide">
                                    ✓ Encerramento
                                  </span>
                                  <span className="text-emerald-400/80">{formatDateTime(treatment.endingDate || treatment.paidAt || treatment.openingDate)}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                                  {lastInteraction?.description || treatment.observations || 'Atendimento concluído com sucesso.'}
                                </p>
                                {lastInteraction?.authorName && (
                                  <p className="text-[10px] text-emerald-400/70 pt-0.5">
                                    Finalizado por: {lastInteraction.authorName}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. PEÇAS E SERVIÇOS APLICADOS */}
                      {treatment.items.length > 0 && (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Package className="h-4 w-4 text-amber-400" />
                            <span>Peças e Serviços Aplicados</span>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                            <div className="divide-y divide-slate-800/60">
                              {treatment.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 text-xs">
                                  <div className="flex items-center gap-2.5">
                                    <Badge
                                      variant="outline"
                                      className={"text-[9px] font-bold uppercase px-1.5 py-0 " + (item.type === 'product' ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-blue-500/30 text-blue-400 bg-blue-500/10")}
                                    >
                                      {item.type === 'product' ? 'Peça' : 'Serviço'}
                                    </Badge>
                                    <span className="font-semibold text-slate-200">{item.name}</span>
                                    <span className="text-slate-400">({item.quantity}x)</span>
                                  </div>
                                  <span className="font-bold text-white">{formatBRL(item.totalPrice)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. CONDIÇÃO FINANCEIRA & PAGAMENTO */}
                      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/80 to-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Forma de Pagamento</span>
                            <p className="font-bold text-white text-xs sm:text-sm">
                              {treatment.payments.length > 0
                                ? treatment.payments.map((p) => p.method).join(', ')
                                : 'À Vista / Faturamento'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Valor Total da O.S.</span>
                            <p className="text-base font-black text-white leading-none mt-0.5">
                              {formatBRL(treatment.totalAmount)}
                            </p>
                          </div>

                          <Badge
                            className={"font-black text-xs px-3 py-1 rounded-xl shadow-sm " + (treatment.isPaid ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-600 hover:bg-amber-600 text-white")}
                          >
                            {treatment.isPaid ? '✓ PAGO' : 'EM ABERTO'}
                          </Badge>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mx-auto max-w-4xl px-4 pt-12 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} METRICS TI • Gestão Inteligente de Ordens de Serviço e TI</p>
      </footer>
    </div>
  )
}
