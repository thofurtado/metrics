import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Helmet } from 'react-helmet-async'
import { 
  Monitor, 
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  MessageSquare, 
  Layers, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Phone
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricsIcon } from '@/components/MetricsIcon'

export function EquipmentHistoryPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-equipment-history', id],
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.metrics.dev.br'
      const res = await axios.get(`${baseUrl}/public/equipments/${id}/history`)
      return res.data.equipment
    },
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <MetricsIcon className="h-12 w-12 animate-bounce mb-4" />
        <p className="text-sm text-slate-400 font-medium animate-pulse">Carregando prontuário técnico do equipamento...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Card className="max-w-md w-full bg-slate-900/80 border-slate-800 backdrop-blur-xl p-6 text-center">
          <Monitor className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Equipamento Não Localizado</h2>
          <p className="text-xs text-muted-foreground mt-2">
            O identificador deste equipamento não foi encontrado no sistema ou a etiqueta foi desativada.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Helmet title={`Prontuário ${data.identification} • Metrics TI`} />
      
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground pb-12">
        {/* HEADER HERO */}
        <header className="border-b border-border/40 bg-card/40 backdrop-blur-2xl sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MetricsIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  METRICS TI
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-0">
                    Verificado
                  </Badge>
                </h1>
                <p className="text-[11px] text-muted-foreground">Prontuário Vitalício de Manutenção</p>
              </div>
            </div>

            <Button
              asChild
              size="sm"
              className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
            >
              <a href="https://wa.me/5512997753965" target="_blank" rel="noreferrer">
                <Phone className="h-3.5 w-3.5" />
                Suporte
              </a>
            </Button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
          {/* CARD DO EQUIPAMENTO */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl overflow-hidden">
            <CardHeader className="bg-secondary/20 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black tracking-tight">{data.identification}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {data.clientName} {data.groupName ? `• ${data.groupName}` : ''}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-mono text-xs py-1 px-2.5">
                  {data.type}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Manutenções</p>
                  <p className="text-lg font-bold text-primary mt-0.5">{data.totalTreatments} O.S.</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Primeiro Cadastro</p>
                  <p className="text-xs font-semibold text-foreground mt-1">
                    {new Date(data.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3 border border-border/40 col-span-2 sm:col-span-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Garantia & Procedência</p>
                  <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Suporte Oficial
                  </p>
                </div>
              </div>

              {data.details && (
                <div className="text-xs text-muted-foreground bg-secondary/20 rounded-lg p-2.5 border border-border/30">
                  <span className="font-semibold text-foreground">Especificações: </span>
                  {data.details}
                </div>
              )}
            </CardContent>
          </Card>

          {/* LINHA DO TEMPO / HISTÓRICO DE ATENDIMENTOS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Histórico Completo de Manutenções & Ordens de Serviço
            </h3>

            {data.treatments.length === 0 ? (
              <Card className="border-dashed bg-card/30 text-center py-8">
                <p className="text-xs text-muted-foreground">Nenhum atendimento registrado nesta máquina até o momento.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {data.treatments.map((os: any, idx: number) => (
                  <Card key={os.id} className="border-border/60 bg-card/60 backdrop-blur-xl shadow-md overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-secondary/20 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[11px] font-bold">
                            #{os.id.substring(0, 8).toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(os.openingDate).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <Badge className={`text-[10px] font-semibold py-0.5 ${
                          os.status === 'finished' || os.status === 'concluido'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {os.status === 'finished' || os.status === 'concluido' ? 'Concluído' : 'Em Andamento'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase">Solicitação / Motivo:</p>
                        <p className="text-xs text-foreground font-medium mt-0.5">{os.request}</p>
                      </div>

                      {os.items && os.items.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">
                            Serviços Executados & Peças:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {os.items.map((item: any) => (
                              <Badge key={item.id} variant="secondary" className="text-[11px]">
                                ✓ {item.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {os.observations && (
                        <div className="bg-secondary/30 rounded-lg p-2.5 border border-border/40 text-xs">
                          <p className="font-semibold text-primary text-[11px]">Laudo do Técnico / Observações:</p>
                          <p className="text-muted-foreground mt-0.5 leading-relaxed">{os.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
