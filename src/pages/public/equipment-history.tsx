'use client'

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
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
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react'
import { useState } from 'react'

import { api } from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.locale('pt-br')

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
  const response = await api.get('/public/equipments/' + id + '/history', {
    headers: {
      'x-tenant-domain': currentHost,
    },
  })
  return response.data.equipment
}

const formatBRL = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

const calculateDuration = (opening: string, ending?: string | null) => {
  const end = ending ? dayjs(ending) : dayjs()
  const start = dayjs(opening)
  if (end.isBefore(start)) return 'Recém aberto'

  const diff = end.diff(start)
  const dur = dayjs.duration(diff)
  const days = dur.days()
  const hours = dur.hours()
  const minutes = dur.minutes()

  let out = ''
  if (days > 0) out += days + 'd '
  if (hours > 0) out += hours + 'h '
  out += minutes + 'min'
  return out.trim() || 'Poucos minutos'
}

function parseHardwareSpecs(equipment: EquipmentData) {
  const tel = equipment.telemetry || {}
  const details = (equipment.details || '').trim()

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

  let ram: string | null = null
  if (tel.mem) {
    if (typeof tel.mem === 'object' && typeof tel.mem.total === 'number') {
      const gb = Math.round(tel.mem.total / (1024 * 1024 * 1024))
      if (gb > 0) ram = gb + ' GB RAM'
    } else if (typeof tel.mem === 'string' && tel.mem !== '[object Object]') {
      ram = tel.mem
    }
  } else if (tel.ram && typeof tel.ram === 'string') {
    ram = tel.ram
  }

  let disk: string | null = null
  if (Array.isArray(tel.fsSize) && tel.fsSize.length > 0) {
    const primary = tel.fsSize[0]
    const size = Math.round(primary.totalSizeGB || primary.size || 0)
    if (size > 0) {
      disk = size + ' GB SSD / HD'
    }
  } else if (tel.disk) {
    if (typeof tel.disk === 'object') {
      disk = tel.disk.size ? tel.disk.size + ' GB' : tel.disk.name || null
    } else if (typeof tel.disk === 'string' && tel.disk !== '[object Object]') {
      disk = tel.disk
    }
  }

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
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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

      <main className="mx-auto max-w-5xl px-4 pt-6 space-y-6">
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
                <span className="text-[11px] text-slate-400">Cadastrado em {dayjs(equipment.createdAt).format('DD/MM/YYYY')}</span>
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

          {/* TELEMETRIA DE HARDWARE */}
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
              Linha do tempo cronológica da abertura à resolução com peças e quitação financeira
            </p>
          </div>
        </div>

        {/* LISTA DE ORDENS DE SERVIÇO EM DARK THEME STORYTELLING */}
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
          <div className="space-y-6">
            {equipment.treatments.map((treatment, index) => {
              const isExpanded = expandedTreatments[treatment.id] !== undefined
                ? expandedTreatments[treatment.id]
                : index === 0

              const isFinished = treatment.status === 'finished' || treatment.status === 'resolved' || !!treatment.endingDate
              const durText = calculateDuration(treatment.openingDate, treatment.endingDate)

              // Separar a última interação (se concluído) das interações intermediárias
              const allInteractions = treatment.interactions || []
              const hasInteractions = allInteractions.length > 0
              const lastInteraction = isFinished && hasInteractions ? allInteractions[allInteractions.length - 1] : null
              const intermediateInteractions = isFinished && hasInteractions
                ? allInteractions.slice(0, allInteractions.length - 1)
                : allInteractions

              return (
                <div
                  key={treatment.id}
                  className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 text-slate-100 shadow-2xl backdrop-blur-xl transition-all duration-200"
                >
                  {/* BARRA SUPERIOR AZUL BRANDING */}
                  <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

                  {/* 1. HEADER CARD PRINCIPAL */}
                  <div className="p-6 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={"border font-bold text-xs px-2.5 py-0.5 " + (isFinished ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400")}
                          >
                            {isFinished ? 'Finalizado' : 'Em Andamento'}
                          </Badge>

                          <span className="text-xs text-slate-600 font-bold">•</span>

                          <span className={"text-xs font-bold " + (treatment.isPaid ? "text-emerald-400" : "text-amber-400")}>
                            {treatment.isPaid ? '✓ Quitado' : '● Pendente'}
                          </span>
                        </div>

                        <h2 className="text-2xl font-black tracking-tight text-white">
                          {treatment.request || 'Chamado Técnico'}
                        </h2>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-start">
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Valor O.S.</span>
                          <p className="text-lg font-black text-emerald-400">{formatBRL(treatment.totalAmount)}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleTreatment(treatment.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          title={isExpanded ? 'Recolher' : 'Expandir'}
                        >
                          <ChevronDown
                            className={"h-5 w-5 transition-transform duration-200 " + (isExpanded ? "rotate-180 text-indigo-400" : "")}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 3 CHIPS HORIZONTAIS: CLIENTE, ABERTO EM, DURAÇÃO */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-800/80 mt-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400 border border-blue-500/20">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-400 text-[11px]">Cliente</p>
                          <p className="font-bold text-white truncate" title={equipment.clientName}>
                            {equipment.clientName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400 border border-purple-500/20">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-400 text-[11px]">Aberto em</p>
                          <p className="font-bold text-white">
                            {dayjs(treatment.openingDate).format('DD/MM/YYYY')}
                            <span className="ml-1.5 font-normal text-slate-400">
                              {dayjs(treatment.openingDate).format('HH:mm')}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-400 border border-orange-500/20">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-400 text-[11px]">Duração</p>
                          <p className="font-bold text-white">{durText}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. LINHA DO TEMPO CRONOLÓGICA CONTÍNUA (STORYTELLING DA O.S.) */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 bg-slate-950/60 p-6 space-y-6">
                      
                      {/* LINHA DO TEMPO UNIFICADA */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                          <Activity className="h-4 w-4" />
                          <span>Evolução Cronológica do Atendimento</span>
                        </div>

                        <div className="relative ml-2 space-y-6 border-l-2 border-slate-800 pl-5">
                          
                          {/* NÓ 1: ABERTURA + MOTIVO / RELATO INICIAL */}
                          <div className="relative">
                            <div className="absolute -left-[27px] top-2 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-indigo-500 ring-2 ring-indigo-500/30" />
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                                  1. Chamado Aberto
                                </span>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {dayjs(treatment.openingDate).format('DD/MM/YYYY HH:mm')}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-white">
                                {treatment.request}
                              </h4>
                              {treatment.observations && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border-l-4 border-amber-500 text-xs text-amber-200 font-medium leading-relaxed">
                                  <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Relato Inicial / Observações:</p>
                                  {treatment.observations}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* NÓ 2: INTERAÇÕES TÉCNICAS INTERMEDIÁRIAS */}
                          {intermediateInteractions.map((inter, idx) => (
                            <div key={inter.id || idx} className="relative">
                              <div className="absolute -left-[27px] top-3 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-blue-500 ring-2 ring-blue-500/30" />
                              <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-md transition-all hover:border-slate-700">
                                <div className="absolute -left-1.5 top-3.5 h-2 w-2 rotate-45 transform border-b border-l border-slate-800 bg-slate-900" />
                                <p className="text-xs leading-relaxed text-slate-200 font-medium mb-3 whitespace-pre-wrap">
                                  {inter.description}
                                </p>
                                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px]">
                                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 font-bold text-blue-400">
                                    {inter.authorName || 'Técnico Responsável'}
                                  </span>
                                  <span className="text-slate-400">
                                    {dayjs(inter.createdAt).format('DD/MM/YYYY HH:mm')} ({dayjs(inter.createdAt).fromNow()})
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* NÓ 3: RESOLUÇÃO / ENCERRAMENTO (ÚLTIMA INTERAÇÃO) */}
                          {isFinished && (
                            <div className="relative">
                              <div className="absolute -left-[27px] top-2 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-500 ring-2 ring-emerald-500/30" />
                              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 shadow-lg space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-400">
                                    <CheckCircle className="h-3.5 w-3.5" /> Encerramento & Resolução
                                  </span>
                                  <span className="text-[11px] text-emerald-400 font-bold">
                                    {dayjs(treatment.endingDate || treatment.openingDate).format('DD/MM/YYYY HH:mm')}
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm font-semibold text-emerald-100 leading-relaxed whitespace-pre-wrap">
                                  {lastInteraction?.description || 'Atendimento concluído com sucesso e equipamento liberado.'}
                                </p>
                                {lastInteraction?.authorName && (
                                  <span className="inline-block text-[10px] font-bold text-emerald-400 pt-1">
                                    Finalizado por: {lastInteraction.authorName}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* PEÇAS, SERVIÇOS E PAGAMENTO (INTEGRADOS AO FINAL DO STORYTELLING) */}
                      <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* CARD DE PEÇAS E SERVIÇOS */}
                        {treatment.items.length > 0 ? (
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg">
                            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 p-3.5 px-4">
                              <div className="flex items-center gap-2 text-slate-200">
                                <Package className="h-4 w-4 text-indigo-400" />
                                <h3 className="font-bold text-xs">Peças & Serviços Aplicados</h3>
                              </div>
                              <Badge variant="secondary" className="text-[10px] font-bold bg-slate-800 text-slate-300">
                                {treatment.items.length} {treatment.items.length === 1 ? 'item' : 'itens'}
                              </Badge>
                            </div>
                            <div className="divide-y divide-slate-800/80 text-xs">
                              {treatment.items.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className="grid grid-cols-12 items-center gap-2 p-3 hover:bg-slate-800/40 transition-colors"
                                >
                                  <div className="col-span-6 flex flex-col font-medium text-slate-200">
                                    <span>{item.name}</span>
                                    <span className="text-[10px] text-slate-400 font-normal uppercase">
                                      {item.type === 'product' ? 'Peça / Material' : 'Mão de Obra'}
                                    </span>
                                  </div>
                                  <div className="col-span-2 rounded-md bg-slate-800 py-1 text-center font-bold text-slate-300">
                                    {item.quantity}x
                                  </div>
                                  <div className="col-span-4 text-right font-black text-white">
                                    {formatBRL(item.totalPrice)}
                                  </div>
                                </div>
                              ))}

                              <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">Total O.S.</span>
                                <span className="text-base font-black text-emerald-400">
                                  {formatBRL(treatment.totalAmount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center gap-3 text-xs text-slate-400">
                            <Info className="h-5 w-5 text-slate-500 shrink-0" />
                            <span>Nenhuma peça ou serviço com cobrança foi lançado nesta O.S.</span>
                          </div>
                        )}

                        {/* CARD DE CONDIÇÃO FINANCEIRA / PAGAMENTO */}
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 flex flex-col justify-between shadow-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <CreditCard className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Forma de Pagamento</p>
                                <p className="font-bold text-sm text-white">
                                  {treatment.payments.length > 0
                                    ? treatment.payments.map((p) => p.method).join(', ')
                                    : 'À Vista / Faturamento'}
                                </p>
                              </div>
                            </div>

                            <Badge
                              className={"font-black text-xs px-3 py-1 rounded-xl " + (treatment.isPaid ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-500 text-white")}
                            >
                              {treatment.isPaid ? '✓ PAGO' : 'PENDENTE'}
                            </Badge>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Status Financeiro:</span>
                            <span className={"font-bold " + (treatment.isPaid ? "text-emerald-400" : "text-amber-400")}>
                              {treatment.isPaid ? 'Totalmente Quitado' : 'Aguardando Pagamento'}
                            </span>
                          </div>
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
      <footer className="mx-auto max-w-5xl px-4 pt-12 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} METRICS TI • Gestão Inteligente de Ordens de Serviço e TI</p>
      </footer>
    </div>
  )
}
