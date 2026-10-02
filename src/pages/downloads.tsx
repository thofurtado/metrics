import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import {
  Download,
  Monitor,
  Wrench,
  Clock,
  ShieldCheck,
  Search,
  Sparkles,
  Smartphone,
  UtensilsCrossed,
  FolderSync,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

const R2_BASE_URL = 'https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev'
const API_BASE_URL = 'https://api.metrics.dev.br'

interface DownloadItem {
  id: string
  name: string
  subtitle: string
  fileName: string
  version: string
  size: string
  features: string[]
  tag: 'Oficial' | 'Suporte' | 'Drivers' | 'Utilitários' | 'Navegador' | 'Sistema'
  isOfficial?: boolean
  downloadUrl: string
  iconType: 'pdv' | 'windy' | 'sync' | 'ponto' | 'mobile' | 'garcom' | 'support' | 'util'
  colorScheme: 'indigo' | 'cyan' | 'emerald' | 'amber' | 'violet' | 'teal' | 'slate'
}

const officialApps: DownloadItem[] = [
  {
    id: 'metrics-pdv',
    name: 'Metrics PDV',
    subtitle: 'Frente de Caixa & Emissor Fiscal',
    fileName: 'Instalar_MetricsPDV.exe',
    version: 'v2.4.41.0',
    size: '520 MB',
    features: ['NFC-e / SAT', 'Multi-Terminal', 'Offline Automático'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/pdv/download`,
    iconType: 'pdv',
    colorScheme: 'indigo',
  },
  {
    id: 'metrics-windy',
    name: 'Metrics Windy',
    subtitle: 'Agente de Telemetria & Suporte',
    fileName: 'Metrics_Windy_Setup.exe',
    version: 'v2.3.2.5',
    size: '60 MB',
    features: ['Telemetria em Tempo Real', 'Suporte Remoto', 'Auto-Update'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/windy/download`,
    iconType: 'windy',
    colorScheme: 'cyan',
  },
  {
    id: 'metrics-sync',
    name: 'Metrics Sync',
    subtitle: 'Importação & Migração de Dados',
    fileName: 'Metrics_Sync_Setup.exe',
    version: 'v1.3.2.6',
    size: '60 MB',
    features: ['Migração de Concorrentes', 'Athos & SvCloud', 'Importação Rápida'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/sync/download`,
    iconType: 'sync',
    colorScheme: 'emerald',
  },
  {
    id: 'metrics-ponto',
    name: 'Metrics Ponto',
    subtitle: 'Ponto Eletrônico & Gestão RH',
    fileName: 'Metrics_Ponto_Setup.exe',
    version: 'v1.2.0',
    size: '65 MB',
    features: ['Portaria 671 MTE', 'Modo Totem / Kiosk', 'Registro Offline'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/ponto/download`,
    iconType: 'ponto',
    colorScheme: 'amber',
  },
  {
    id: 'metrics-mobile',
    name: 'Metrics Mobile',
    subtitle: 'Gestão e Acompanhamento Gerencial',
    fileName: 'metrics-mobile.apk',
    version: 'v2.0.0',
    size: '22 MB',
    features: ['Dashboard em Tempo Real', 'Vendas e Fechamentos', 'Android'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/mobile/download`,
    iconType: 'mobile',
    colorScheme: 'violet',
  },
  {
    id: 'metrics-garcom',
    name: 'Metrics Garçom',
    subtitle: 'Atendimento de Salão & Mesas',
    fileName: 'metrics-garcom.apk',
    version: 'v2.0.0',
    size: '20 MB',
    features: ['Mesas & Comandas', 'Rede Local Instantânea', 'Android'],
    tag: 'Oficial',
    isOfficial: true,
    downloadUrl: `${API_BASE_URL}/api/public/garcom/download`,
    iconType: 'garcom',
    colorScheme: 'teal',
  },
]

const utilityApps: DownloadItem[] = [
  {
    id: 'anydesk',
    name: 'AnyDesk',
    subtitle: 'Acesso Remoto Assistido',
    fileName: 'AnyDesk.exe',
    version: 'Oficial',
    size: '6 MB',
    features: ['Suporte Remoto'],
    tag: 'Suporte',
    downloadUrl: `${R2_BASE_URL}/AnyDesk.exe`,
    iconType: 'support',
    colorScheme: 'slate',
  },
  {
    id: 'chrome-offline',
    name: 'Google Chrome',
    subtitle: 'Instalador Offline 64-bit',
    fileName: 'ChromeStandaloneSetup64.exe',
    version: '64-bit',
    size: '138 MB',
    features: ['Navegador Web'],
    tag: 'Navegador',
    downloadUrl: `${R2_BASE_URL}/ChromeStandaloneSetup64.exe`,
    iconType: 'util',
    colorScheme: 'slate',
  },
  {
    id: 'lightshot',
    name: 'Lightshot',
    subtitle: 'Captura de Tela Ágil',
    fileName: 'Lightshot.exe',
    version: 'Oficial',
    size: '3 MB',
    features: ['Printscreen'],
    tag: 'Utilitários',
    downloadUrl: `${R2_BASE_URL}/Lightshot.exe`,
    iconType: 'util',
    colorScheme: 'slate',
  },
  {
    id: 'driver-booster',
    name: 'Driver Booster Pro',
    subtitle: 'Atualização de Drivers',
    fileName: 'Driver Booster Pro 7.rar',
    version: 'v7.0',
    size: '21 MB',
    features: ['Drivers Windows'],
    tag: 'Drivers',
    downloadUrl: `${R2_BASE_URL}/Driver%20Booster%20Pro%207.rar`,
    iconType: 'util',
    colorScheme: 'slate',
  },
  {
    id: 'firewall-blocker',
    name: 'Folder Firewall Blocker',
    subtitle: 'Isolamento de Conexões Locais',
    fileName: 'Folder_Firewall_Blocker_1.2.1.exe',
    version: 'v1.2.1',
    size: '150 KB',
    features: ['Segurança de Rede'],
    tag: 'Utilitários',
    downloadUrl: `${R2_BASE_URL}/Folder_Firewall_Blocker_1.2.1.exe`,
    iconType: 'util',
    colorScheme: 'slate',
  },
  {
    id: 'startup-delayer',
    name: 'Startup Delayer',
    subtitle: 'Otimização de Inicialização',
    fileName: 'startup-delayer-v3.0b366.exe',
    version: 'v3.0',
    size: '6 MB',
    features: ['Otimização'],
    tag: 'Sistema',
    downloadUrl: `${R2_BASE_URL}/startup-delayer-v3.0b366.exe`,
    iconType: 'util',
    colorScheme: 'slate',
  },
]

export function DownloadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<'Todos' | 'Oficiais Metrics' | 'Suporte' | 'Drivers' | 'Utilitários'>('Todos')
  const [liveCatalog, setLiveCatalog] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/public/apps-catalog`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.apps && Array.isArray(data.apps)) {
          const map: Record<string, any> = {}
          data.apps.forEach((app: any) => {
            if (app.key) map[app.key] = app
            if (app.id) map[app.id] = app
          })
          setLiveCatalog(map)
        }
      })
      .catch(() => {})
  }, [])

  const allItems = [...officialApps, ...utilityApps]

  const tags: Array<'Todos' | 'Oficiais Metrics' | 'Suporte' | 'Drivers' | 'Utilitários'> = [
    'Todos',
    'Oficiais Metrics',
    'Suporte',
    'Drivers',
    'Utilitários',
  ]

  const filteredFiles = allItems.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.features.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    if (selectedTag === 'Todos') return true
    if (selectedTag === 'Oficiais Metrics') return file.isOfficial
    if (selectedTag === 'Suporte') return file.tag === 'Suporte'
    if (selectedTag === 'Drivers') return file.tag === 'Drivers'
    if (selectedTag === 'Utilitários') return file.tag === 'Utilitários' || file.tag === 'Sistema' || file.tag === 'Navegador'

    return true
  })

  const getAppIcon = (type: string) => {
    switch (type) {
      case 'pdv':
        return <Monitor className="h-5 w-5" />
      case 'windy':
        return <Wrench className="h-5 w-5" />
      case 'sync':
        return <FolderSync className="h-5 w-5" />
      case 'ponto':
        return <Clock className="h-5 w-5" />
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'garcom':
        return <UtensilsCrossed className="h-5 w-5" />
      case 'support':
        return <ShieldCheck className="h-5 w-5" />
      default:
        return <Download className="h-5 w-5" />
    }
  }

  const getColorClasses = (scheme: string) => {
    switch (scheme) {
      case 'indigo':
        return {
          iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50',
          badge: 'bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50',
          btn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 shadow-md',
          accent: 'hover:border-indigo-300 dark:hover:border-indigo-600',
        }
      case 'cyan':
        return {
          iconBg: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/50',
          badge: 'bg-cyan-50/80 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-800/50',
          btn: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20 shadow-md',
          accent: 'hover:border-cyan-300 dark:hover:border-cyan-600',
        }
      case 'emerald':
        return {
          iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50',
          badge: 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50',
          btn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 shadow-md',
          accent: 'hover:border-emerald-300 dark:hover:border-emerald-600',
        }
      case 'amber':
        return {
          iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50',
          badge: 'bg-amber-50/80 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50',
          btn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20 shadow-md',
          accent: 'hover:border-amber-300 dark:hover:border-amber-600',
        }
      case 'violet':
        return {
          iconBg: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50',
          badge: 'bg-violet-50/80 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200/50 dark:border-violet-800/50',
          btn: 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20 shadow-md',
          accent: 'hover:border-violet-300 dark:hover:border-violet-600',
        }
      case 'teal':
        return {
          iconBg: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-100 dark:border-teal-900/50',
          badge: 'bg-teal-50/80 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50',
          btn: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20 shadow-md',
          accent: 'hover:border-teal-300 dark:hover:border-teal-600',
        }
      default:
        return {
          iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
          btn: 'bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 shadow-sm',
          accent: 'hover:border-slate-300 dark:hover:border-slate-600',
        }
    }
  }

  return (
    <>
      <Helmet>
        <title>Central de Downloads | Eureca Tech & Metrics</title>
        <meta
          name="description"
          content="Central oficial de downloads da Eureca Tech e Metrics. Baixe os instaladores oficiais e ferramentas de suporte homologadas."
        />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        {/* Header Superior Limpo */}
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 shadow-xs">
          <div className="container mx-auto px-4 sm:px-6 py-3.5">
            <div className="flex items-center justify-between">
              <Link to="/" className="group flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 transition-transform group-hover:scale-105">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-black tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                    EURECA TECH
                  </div>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
                    Central de Downloads
                  </h1>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link to="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    Voltar ao Início
                  </Button>
                </Link>
                <Link to="/sign-in">
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm shadow-indigo-600/20"
                  >
                    Acessar Metrics
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner Limpo e Sofisticado */}
        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-10 text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Instaladores Homologados & Atualizados</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Aplicativos Oficiais{' '}
              <span className="text-indigo-600 dark:text-indigo-400">Metrics</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              Baixe com segurança os instaladores oficiais do PDV, telemetria e aplicativos para toda a sua operação.
            </p>

            {/* Barra de Busca e Filtros Neomórficos */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar aplicativo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTag(t)}
                    className={
                      'text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all ' +
                      (selectedTag === t
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800')
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de Aplicativos em Cards Limpos */}
          <div className="mx-auto grid max-w-6xl gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredFiles.map((file) => {
              const appKey = file.id.replace('metrics-', '')
              const liveInfo = liveCatalog[file.id] || liveCatalog[appKey]
              const displayVersion = liveInfo?.version ? `v${liveInfo.version}` : file.version
              const displaySize =
                liveInfo?.formattedSize && liveInfo.formattedSize !== '0.0 MB'
                  ? liveInfo.formattedSize
                  : file.size
              const displayUrl = liveInfo?.downloadUrl || file.downloadUrl
              const colors = getColorClasses(file.colorScheme)

              return (
                <div
                  key={file.id}
                  className={
                    'group relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 ' +
                    colors.accent
                  }
                >
                  <div>
                    {/* Header do Card: Ícone + Títulos + Badge de Versão */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-xs ${colors.iconBg}`}
                        >
                          {getAppIcon(file.iconType)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {file.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            {file.subtitle}
                          </p>
                        </div>
                      </div>

                      {/* Chip de Versão */}
                      <span className="flex-shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                        {displayVersion}
                      </span>
                    </div>

                    {/* Recursos Rápidos em Pílulas (Substitui o parágrafo longo) */}
                    <div className="flex flex-wrap gap-1.5 my-3">
                      {file.features.map((feat) => (
                        <span
                          key={feat}
                          className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border border-slate-100 dark:border-slate-800"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rodapé do Card: Tamanho do Arquivo + Botão de Download */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      Tamanho: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{displaySize}</strong>
                    </span>

                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <Button
                        size="sm"
                        className={`h-8 px-3.5 text-xs font-bold rounded-lg transition-transform active:scale-95 ${colors.btn}`}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Baixar
                      </Button>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredFiles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm font-semibold text-slate-500">Nenhum aplicativo encontrado para a sua busca.</p>
            </div>
          )}
        </main>

        {/* Rodapé Discreto */}
        <footer className="mt-16 border-t border-slate-200/80 bg-white/60 dark:border-slate-800/80 dark:bg-slate-900/40 py-8 text-center text-xs text-slate-500">
          <div className="container mx-auto px-4 space-y-2">
            <p>
              Precisa de ajuda ou suporte técnico?{' '}
              <a
                href="https://wa.me/5512992193644"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
              >
                Fale com o Suporte Eureca ↗
              </a>
            </p>
            <p className="text-[11px] text-slate-400">
              &copy; {new Date().getFullYear()} Eureca Tech & Metrics. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
