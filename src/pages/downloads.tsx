import { Download, FileBox, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

import { ParticleBackground } from '../components/three/ParticleBackground'
import { Button } from '../components/ui/button'

// Dummy data for downloads
const R2_BASE_URL = 'https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev'

// Downloads data
const files = [
  {
    name: 'Sistema de Ponto Metrics',
    fileName: 'Metrics Setup 0.0.0.exe',
    version: 'v0.0.0',
    size: 'N/A',
    description:
      'Instalador oficial do sistema de registro e controle de ponto eletrônico do Metrics.',
    tag: 'Sistema',
    popular: true,
  },
  {
    name: 'AnyDesk',
    fileName: 'AnyDesk.exe',
    version: 'Latest',
    size: '6 MB',
    description: 'Ferramenta leve para acesso remoto e suporte técnico.',
    tag: 'Suporte',
    popular: true,
  },
  {
    name: 'Google Chrome (Offline)',
    fileName: 'ChromeStandaloneSetup64.exe',
    version: '64-bit',
    size: '138 MB',
    description: 'Instalador offline completo do navegador Google Chrome.',
    tag: 'Navegador',
  },
  {
    name: 'Lightshot',
    fileName: 'Lightshot.exe',
    version: 'Latest',
    size: '3 MB',
    description: 'A forma mais rápida de tirar screenshots personalizáveis.',
    tag: 'Utilidade',
  },
  {
    name: 'Driver Booster Pro 7',
    fileName: 'Driver Booster Pro 7.rar',
    version: 'v7',
    size: '21 MB',
    description: 'Pacote para verificação e atualização automática de drivers.',
    tag: 'Drivers',
  },
  {
    name: 'Device Doctor',
    fileName: 'DeviceDoctor_Bundle (1).exe',
    version: 'Bundle',
    size: '7 MB',
    description: 'Ferramenta simples para identificar drivers faltantes.',
    tag: 'Drivers',
  },
  {
    name: 'Folder Firewall Blocker',
    fileName: 'Folder_Firewall_Blocker_1.2.1.exe',
    version: 'v1.2.1',
    size: '150 KB',
    description:
      'Bloqueie o acesso à internet de executáveis em pastas específicas.',
    tag: 'Segurança',
  },
  {
    name: 'Startup Delayer',
    fileName: 'startup-delayer-v3.0b366.exe',
    version: 'v3.0',
    size: '6 MB',
    description:
      'Otimize o tempo de inicialização do Windows atrasando programas.',
    tag: 'Sistema',
  },
  {
    name: 'Pacote Raton',
    fileName: 'RATON.rar',
    version: 'Pack',
    size: '3 MB',
    description: 'Ativador do Ruindows.',
    tag: 'Utilitários',
  },
  {
    name: 'Windy',
    fileName: 'Windy.exe',
    version: 'Latest',
    size: '74 MB',
    description: 'Aplicativo especializado para manutenção do Windows.',
    tag: 'App',
  },
  {
    name: 'Office 2019',
    fileName: 'office2019.rar',
    version: '2019',
    size: 'N/A',
    description: 'Instalador do pacote Microsoft Office 2019.',
    tag: 'Produtividade',
  },
]

export function DownloadsPage() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <>
      <Helmet>
        <title>Downloads | Eureca Tech</title>
        <meta
          name="description"
          content="Central de downloads da Eureca Tech. Baixe sistemas, ferramentas de suporte e drivers."
        />
      </Helmet>

      {/* Particle Background to match Landing Page */}
      <ParticleBackground />

      <div
        className={`min-h-screen bg-gradient-to-br from-blue-900/90 via-teal-800/90 to-purple-900/90 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Header (Simplified from Landing Page) */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="group flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg transition-transform group-hover:scale-105">
                  <svg
                    className="h-6 w-6 text-blue-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-white to-purple-200 bg-clip-text text-2xl font-bold text-transparent text-white">
                  Eureca Tech
                </span>
              </Link>

              <Link to="/">
                <Button
                  variant="outline"
                  className="border-white bg-transparent text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-blue-900"
                >
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container relative z-10 mx-auto px-6 py-12">
          <div className="mb-16 text-center">
            <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
              Central de{' '}
              <span className="bg-gradient-to-r from-purple-300 via-blue-300 to-teal-300 bg-clip-text text-transparent">
                Downloads
              </span>
            </h1>
            <p className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 text-xl text-white/80 backdrop-blur-sm">
              Baixe as versões mais recentes dos nossos sistemas e ferramentas
              de suporte de forma segura e rápida.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={index}
                className={`group relative flex transform flex-col rounded-2xl border border-white/20 bg-white/95 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${file.popular ? 'ring-2 ring-purple-500' : ''}`}
              >
                {file.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    MAIS BAIXADO
                  </div>
                )}
                <div className="mb-6 flex items-start justify-between">
                  <div
                    className={`rounded-xl p-4 ${
                      file.tag === 'Sistema'
                        ? 'bg-purple-100 text-purple-600'
                        : file.tag === 'Suporte'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-teal-100 text-teal-600'
                    }`}
                  >
                    {file.tag === 'Sistema' ? (
                      <RefreshCw className="h-8 w-8" />
                    ) : file.tag === 'Suporte' ? (
                      <FileBox className="h-8 w-8" />
                    ) : (
                      <Download className="h-8 w-8" />
                    )}
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-600">
                    {file.tag}
                  </span>
                </div>

                <h3 className="mb-2 text-xl font-bold text-gray-900 transition-colors group-hover:text-primary">
                  {file.name}
                </h3>
                <div className="mb-4 flex items-center gap-4 font-mono text-sm text-gray-500">
                  <span>{file.version}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span>{file.size}</span>
                </div>

                <p className="mb-8 flex-1 leading-relaxed text-gray-600">
                  {file.description}
                </p>

                <a
                  href={`${R2_BASE_URL}/${file.fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto"
                >
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-6 font-semibold text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-blue-700 group-hover:shadow-xl">
                    <Download className="mr-2 h-5 w-5" />
                    Baixar Agora
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </main>

        {/* Footer (Simplified from Landing Page) */}
        <footer className="relative mt-20 overflow-hidden bg-gray-900 py-12 text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"></div>
          <div className="container relative z-10 mx-auto px-6 text-center">
            <p className="mb-4 text-gray-400">
              Precisa de ajuda com a instalação?
              <a
                href="https://wa.me/5512992193644"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 font-semibold text-white transition-colors hover:text-purple-300"
              >
                Fale com o suporte
              </a>
            </p>
            <div className="mt-8 border-t border-gray-800 pt-8 text-sm text-gray-500">
              <p>
                &copy; {new Date().getFullYear()} Eureca Tech. Todos os direitos
                reservados.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
