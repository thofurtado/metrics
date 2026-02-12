import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { ParticleBackground } from '../components/three/ParticleBackground'
import { useEffect, useState } from 'react'
import { Download, FileBox, RefreshCw } from 'lucide-react'

// Dummy data for downloads
const R2_BASE_URL = "https://pub-92bef1bd95274c4885abde2bc51eadfb.r2.dev"

// Downloads data
const files = [
    {
        name: "AnyDesk",
        fileName: "AnyDesk.exe",
        version: "Latest",
        size: "6 MB",
        description: "Ferramenta leve para acesso remoto e suporte técnico.",
        tag: "Suporte",
        popular: true
    },
    {
        name: "Google Chrome (Offline)",
        fileName: "ChromeStandaloneSetup64.exe",
        version: "64-bit",
        size: "138 MB",
        description: "Instalador offline completo do navegador Google Chrome.",
        tag: "Navegador"
    },
    {
        name: "Lightshot",
        fileName: "Lightshot.exe",
        version: "Latest",
        size: "3 MB",
        description: "A forma mais rápida de tirar screenshots personalizáveis.",
        tag: "Utilidade"
    },
    {
        name: "Driver Booster Pro 7",
        fileName: "Driver Booster Pro 7.rar",
        version: "v7",
        size: "21 MB",
        description: "Pacote para verificação e atualização automática de drivers.",
        tag: "Drivers"
    },
    {
        name: "Device Doctor",
        fileName: "DeviceDoctor_Bundle (1).exe",
        version: "Bundle",
        size: "7 MB",
        description: "Ferramenta simples para identificar drivers faltantes.",
        tag: "Drivers"
    },
    {
        name: "Folder Firewall Blocker",
        fileName: "Folder_Firewall_Blocker_1.2.1.exe",
        version: "v1.2.1",
        size: "150 KB",
        description: "Bloqueie o acesso à internet de executáveis em pastas específicas.",
        tag: "Segurança"
    },
    {
        name: "Startup Delayer",
        fileName: "startup-delayer-v3.0b366.exe",
        version: "v3.0",
        size: "6 MB",
        description: "Otimize o tempo de inicialização do Windows atrasando programas.",
        tag: "Sistema"
    },
    {
        name: "Pacote Raton",
        fileName: "RATON.rar",
        version: "Pack",
        size: "3 MB",
        description: "Ativador do Ruindows.",
        tag: "Utilitários"
    },
    {
        name: "Windy",
        fileName: "Windy.exe",
        version: "Latest",
        size: "74 MB",
        description: "Aplicativo especializado para manutenção do Windows.",
        tag: "App"
    }
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
                <meta name="description" content="Central de downloads da Eureca Tech. Baixe sistemas, ferramentas de suporte e drivers." />
            </Helmet>

            {/* Particle Background to match Landing Page */}
            <ParticleBackground />

            <div className={`min-h-screen bg-gradient-to-br from-blue-900/90 via-teal-800/90 to-purple-900/90 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>

                {/* Header (Simplified from Landing Page) */}
                <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <span className="text-2xl font-bold text-white bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                                    Eureca Tech
                                </span>
                            </Link>

                            <Link to="/">
                                <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-900 backdrop-blur-sm transition-all duration-300">
                                    Voltar ao Início
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-6 py-12 relative z-10">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Central de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-blue-300 to-teal-300">Downloads</span>
                        </h1>
                        <p className="text-xl text-white/80 max-w-2xl mx-auto backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
                            Baixe as versões mais recentes dos nossos sistemas e ferramentas de suporte de forma segura e rápida.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className={`bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl hover:scale-[1.02] transform transition-all duration-300 flex flex-col group relative ${file.popular ? 'ring-2 ring-purple-500' : ''}`}
                            >
                                {file.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                        MAIS BAIXADO
                                    </div>
                                )}
                                <div className="flex items-start justify-between mb-6">
                                    <div className={`p-4 rounded-xl ${file.tag === 'Sistema' ? 'bg-purple-100 text-purple-600' :
                                        file.tag === 'Suporte' ? 'bg-blue-100 text-blue-600' :
                                            'bg-teal-100 text-teal-600'
                                        }`}>
                                        {file.tag === 'Sistema' ? <RefreshCw className="w-8 h-8" /> :
                                            file.tag === 'Suporte' ? <FileBox className="w-8 h-8" /> :
                                                <Download className="w-8 h-8" />}
                                    </div>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600 uppercase tracking-wider">
                                        {file.tag}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                                    {file.name}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 font-mono">
                                    <span>{file.version}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span>{file.size}</span>
                                </div>

                                <p className="text-gray-600 mb-8 flex-1 leading-relaxed">
                                    {file.description}
                                </p>

                                <a href={`${R2_BASE_URL}/${file.fileName}`} target="_blank" rel="noopener noreferrer" className="mt-auto">
                                    <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                                        <Download className="mr-2 w-5 h-5" />
                                        Baixar Agora
                                    </Button>
                                </a>
                            </div>
                        ))}
                    </div>
                </main>

                {/* Footer (Simplified from Landing Page) */}
                <footer className="bg-gray-900 text-white py-12 relative overflow-hidden mt-20">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"></div>
                    <div className="container mx-auto px-6 relative z-10 text-center">
                        <p className="text-gray-400 mb-4">
                            Precisa de ajuda com a instalação?
                            <a href="https://wa.me/5512992193644" target="_blank" rel="noopener noreferrer" className="text-white hover:text-purple-300 ml-2 font-semibold transition-colors">
                                Fale com o suporte
                            </a>
                        </p>
                        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-gray-500">
                            <p>&copy; {new Date().getFullYear()} Eureca Tech. Todos os direitos reservados.</p>
                        </div>
                    </div>
                </footer>

            </div>
        </>
    )
}
