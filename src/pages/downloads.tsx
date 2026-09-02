'use client'

import { Download, Monitor, Wrench, Clock, ShieldCheck, Search, Sparkles, Smartphone, CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

import { ParticleBackground } from '../components/three/ParticleBackground'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'

const R2_BASE_URL = 'https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev'
const API_BASE_URL = 'https://api.metrics.dev.br'

interface DownloadItem {
  id: string
  name: string
  fileName: string
  version: string
  size: string
  description: string
  tag: 'Oficial' | 'Sistema' | 'Suporte' | 'Navegador' | 'Drivers' | 'Segurança' | 'Utilitários' | 'Produtividade'
  isOfficial?: boolean
  downloadUrl: string
  popular?: boolean
  badgeLabel?: string
  iconType?: 'windy' | 'pdv' | 'ponto' | 'mobile' | 'support' | 'util'
}

// Os 3 aplicativos oficiais ativos da nossa empresa
const downloadFiles: DownloadItem[] = [
  {
    id: 'metrics-windy',
    name: 'Metrics Windy - Agente de Telemetria & Suporte',
    fileName: 'Metrics_Windy_Setup.exe',
    version: 'v2.3.1.0 (Oficial)',
    size: '60 MB',
    description: 'Agente inteligente para monitoramento contínuo em tempo real (CPU, RAM, Atividade de Leitura/Escrita de Disco e Sensores Térmicos), suporte remoto integrado e manutenção preventiva do Windows.',
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/windy/download`,
    popular: true,
    badgeLabel: 'OFICIAL • TELEMETRIA & SUPORTE',
    iconType: 'windy',
  },
  {
    id: 'metrics-pdv',
    name: 'Metrics PDV - Frente de Caixa & Emissor Fiscal',
    fileName: 'Instalar_MetricsPDV.exe',
    version: 'v2.4.0 (Oficial)',
    size: '520 MB',
    description: 'Frente de caixa completo para alta velocidade com emissão de NFC-e/CF-e SAT, contingência offline automática, TEF integrado, controle de mesas e comandas.',
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/pdv/download`,
    popular: true,
    badgeLabel: 'OFICIAL • FRENTE DE CAIXA',
    iconType: 'pdv',
  },
  {
    id: 'metrics-ponto',
    name: 'Metrics Ponto - Ponto Eletrônico & Gestão',
    fileName: 'Metrics Setup 0.0.0.exe',
    version: 'v1.2.0 (Oficial)',
    size: '85 MB',
    description: 'Sistema oficial para registro e controle de jornada de trabalho, espelho de ponto digital, banco de horas e conformidade com a Portaria 671.',
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${R2_BASE_URL}/Metrics%20Setup%200.0.0.exe`,
    popular: true,
    badgeLabel: 'OFICIAL • GESTÃO DE RH',
    iconType: 'ponto',
  },
  {
    id: 'metrics-mobile',
    name: 'Metrics Mobile - Comanda & Gestão Móvel',
    fileName: 'metrics-mobile.apk',
    version: 'v2.0.0 (Oficial)',
    size: '32 MB',
    description: 'Aplicativo móvel para garçons e atendimento de mesas, lançamento ágil de pedidos na praça e acompanhamento em tempo real.',
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${R2_BASE_URL}/metrics-mobile.apk`,
    popular: true,
    badgeLabel: 'OFICIAL • ATENDIMENTO MÓVEL',
    iconType: 'mobile',
  },
  // Ferramentas de suporte e utilitários
  {
    id: 'anydesk',
    name: 'AnyDesk',
    fileName: 'AnyDesk.exe',
    version: 'Latest',
    size: '6 MB',
    description: 'Ferramenta leve para acesso remoto e suporte técnico assistido.',
    tag: 'Suporte',
    downloadUrl: `${R2_BASE_URL}/AnyDesk.exe`,
    popular: false,
    iconType: 'support',
  },
  {
    id: 'chrome-offline',
    name: 'Google Chrome (Offline)',
    fileName: 'ChromeStandaloneSetup64.exe',
    version: '64-bit',
    size: '138 MB',
    description: 'Instalador offline completo do navegador Google Chrome.',
    tag: 'Navegador',
    downloadUrl: `${R2_BASE_URL}/ChromeStandaloneSetup64.exe`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'lightshot',
    name: 'Lightshot',
    fileName: 'Lightshot.exe',
    version: 'Latest',
    size: '3 MB',
    description: 'A forma mais rápida e leve de tirar printscreens personalizáveis.',
    tag: 'Utilitários',
    downloadUrl: `${R2_BASE_URL}/Lightshot.exe`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'driver-booster',
    name: 'Driver Booster Pro 7',
    fileName: 'Driver Booster Pro 7.rar',
    version: 'v7',
    size: '21 MB',
    description: 'Pacote para verificação e atualização automática de drivers do sistema.',
    tag: 'Drivers',
    downloadUrl: `${R2_BASE_URL}/Driver%20Booster%20Pro%207.rar`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'device-doctor',
    name: 'Device Doctor',
    fileName: 'DeviceDoctor_Bundle (1).exe',
    version: 'Bundle',
    size: '7 MB',
    description: 'Ferramenta simples para identificar e baixar drivers ausentes.',
    tag: 'Drivers',
    downloadUrl: `${R2_BASE_URL}/DeviceDoctor_Bundle%20(1).exe`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'firewall-blocker',
    name: 'Folder Firewall Blocker',
    fileName: 'Folder_Firewall_Blocker_1.2.1.exe',
    version: 'v1.2.1',
    size: '150 KB',
    description: 'Bloqueie o acesso à internet de executáveis em pastas específicas com 1 clique.',
    tag: 'Segurança',
    downloadUrl: `${R2_BASE_URL}/Folder_Firewall_Blocker_1.2.1.exe`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'startup-delayer',
    name: 'Startup Delayer',
    fileName: 'startup-delayer-v3.0b366.exe',
    version: 'v3.0',
    size: '6 MB',
    description: 'Otimize o tempo de inicialização do Windows atrasando a abertura de programas.',
    tag: 'Sistema',
    downloadUrl: `${R2_BASE_URL}/startup-delayer-v3.0b366.exe`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'pacote-raton',
    name: 'Pacote Raton',
    fileName: 'RATON.rar',
    version: 'Pack',
    size: '3 MB',
    description: 'Ferramenta de ativação e utilitários do Windows.',
    tag: 'Utilitários',
    downloadUrl: `${R2_BASE_URL}/RATON.rar`,
    popular: false,
    iconType: 'util',
  },
  {
    id: 'office-2019',
    name: 'Office 2019',
    fileName: 'office2019.rar',
    version: '2019',
    size: 'N/A',
    description: 'Instalador do pacote Microsoft Office 2019 Professional.',
    tag: 'Produtividade',
    downloadUrl: `${R2_BASE_URL}/office2019.rar`,
    popular: false,
    iconType: 'util',
  },
]

export function DownloadsPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('Todos')

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const tags = ['Todos', 'Oficiais Metrics', 'Suporte', 'Drivers', 'Utilitários']

  const filteredFiles = downloadFiles.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description.toLowerCase().includes(searchTerm.toLowerCase())

    if (selectedTag === 'Todos') return matchesSearch
    if (selectedTag === 'Oficiais Metrics') return matchesSearch && file.isOfficial
    if (selectedTag === 'Suporte') return matchesSearch && file.tag === 'Suporte'
    if (selectedTag === 'Drivers') return matchesSearch && file.tag === 'Drivers'
    if (selectedTag === 'Utilitários')
      return matchesSearch && (file.tag === 'Utilitários' || file.tag === 'Segurança' || file.tag === 'Sistema' || file.tag === 'Navegador')

    return matchesSearch
  })

  return (
    <>
      <Helmet>
        <title>Central de Downloads | Metrics & Eureca Tech</title>
        <meta
          name="description"
          content="Central oficial de downloads da Eureca Tech e Metrics. Baixe os sistemas oficiais e ferramentas de suporte."
        />
      </Helmet>

      {/* Particle Background */}
      <ParticleBackground />

      <div
        className={"min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950 text-slate-100 transition-opacity duration-1000 " + (isLoaded ? "opacity-100" : "opacity-0")}
      >
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/60 backdrop-blur-md">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="group flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-indigo-500/20 text-white transition-transform group-hover:scale-105">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-black tracking-wider uppercase text-indigo-400">EURECA TECH</span>
                  <h1 className="text-lg font-bold text-white leading-none">Central de Downloads</h1>
                </div>
              </Link>

              <div className="flex items-center gap-3">
                <Link to="/">
                  <Button
                    variant="outline"
                    className="border-white/20 bg-white/5 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-blue-950 text-xs font-bold"
                  >
                    Voltar ao Início
                  </Button>
                </Link>
                <Link to="/sign-in">
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20">
                    Acessar Metrics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container relative z-10 mx-auto px-6 py-12">
          {/* HERO BANNER */}
          <div className="mb-12 text-center max-w-3xl mx-auto space-y-4">
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Aplicativos Oficiais & Ferramentas
            </Badge>

            <h1 className="text-4xl font-black text-white md:text-5xl tracking-tight">
              Central de{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-300 bg-clip-text text-transparent">
                Downloads
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Baixe os instaladores oficiais dos sistemas Metrics (Windy, Ponto e Mobile) distribuídos de forma segura e rápida através da nossa infraestrutura.
            </p>

            {/* BUSCA E FILTROS */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar aplicativo ou ferramenta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-slate-900/80 border-slate-700 text-xs text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTag(t)}
                    className={"text-xs font-bold px-3 py-2 rounded-xl transition-all " + (selectedTag === t ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* GRID DE APLICATIVOS */}
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => {
              return (
                <div
                  key={file.id}
                  className={"group relative flex flex-col rounded-3xl border p-6 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl " + (file.isOfficial ? "border-indigo-500/40 bg-gradient-to-b from-slate-900/90 to-indigo-950/40 shadow-xl shadow-indigo-950/30 ring-1 ring-indigo-500/30" : "border-slate-800/80 bg-slate-900/70 shadow-lg")}
                >
                  {/* BADGE DESTAQUE */}
                  {file.isOfficial && (
                    <div className="absolute -top-3 left-6">
                      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-0.5 text-[10px] font-black tracking-wider uppercase text-white shadow-md shadow-indigo-600/30 border border-indigo-400/30">
                        <Sparkles className="h-2.5 w-2.5" />
                        {file.badgeLabel || 'OFICIAL METRICS'}
                      </span>
                    </div>
                  )}

                  {/* HEADER DO CARD */}
                  <div className="mb-4 mt-2 flex items-start justify-between">
                    <div
                      className={"rounded-2xl p-3.5 shadow-md " + (file.isOfficial ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/20" : file.tag === 'Suporte' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-800 text-slate-300")}
                    >
                      {file.iconType === 'windy' ? (
                        <Wrench className="h-6 w-6" />
                      ) : file.iconType === 'pdv' ? (
                        <Monitor className="h-6 w-6" />
                      ) : file.iconType === 'ponto' ? (
                        <Clock className="h-6 w-6" />
                      ) : file.iconType === 'mobile' ? (
                        <Smartphone className="h-6 w-6" />
                      ) : (
                        <Download className="h-6 w-6" />
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-lg bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {file.tag}
                      </span>
                      {file.isOfficial && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Produção
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TÍTULO E VERSÃO */}
                  <h3 className="mb-1 text-lg font-black text-white group-hover:text-indigo-300 transition-colors">
                    {file.name}
                  </h3>

                  <div className="mb-3 flex items-center gap-3 font-mono text-xs text-slate-400">
                    <span className="font-semibold text-indigo-400">{file.version}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    <span>{file.size}</span>
                  </div>

                  {/* DESCRIÇÃO */}
                  <p className="mb-6 flex-1 text-xs leading-relaxed text-slate-300">
                    {file.description}
                  </p>

                  {/* BOTÃO DE DOWNLOAD */}
                  <a
                    href={file.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto"
                  >
                    <Button
                      className={"w-full py-5 text-xs font-bold shadow-lg transition-all " + (file.isOfficial ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/25" : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar {file.isOfficial ? 'Instalador Oficial' : 'Aplicativo'}
                    </Button>
                  </a>
                </div>
              )
            })}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative mt-20 border-t border-slate-800/80 bg-slate-950/80 py-12 text-slate-400">
          <div className="container mx-auto px-6 text-center space-y-3">
            <p className="text-xs">
              Precisa de ajuda com a instalação ou configuração de algum sistema?
              <a
                href="https://wa.me/5512992193644"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1.5 font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Fale com o Suporte Técnico Eureca ↗
              </a>
            </p>
            <p className="text-[11px] text-slate-500">
              &copy; {new Date().getFullYear()} Eureca Tech & Metrics. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
