// pages/landing-page.tsx
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { ParticleBackground } from '../../../components/three/ParticleBackground'
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

export default function EurecaLanding() {
  const whatsappMessage = "Olá! Gostaria de saber mais sobre o Plano Cuidado Total para minha empresa."
  const whatsappLink = `https://wa.me/5512992193644?text=${encodeURIComponent(whatsappMessage)}`
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <>
      <Helmet>
        <title>Eureca Tech - Consultoria em Informática Essencial</title>
        <meta name="description" content="Soluções completas em TI: suporte técnico, consultoria, automação comercial e treinamentos. Plano Cuidado Total para sua empresa." />
      </Helmet>

      {/* Background com Partículas 3D */}
      <ParticleBackground />

      <div className={`min-h-screen bg-gradient-to-br from-blue-900/90 via-teal-800/90 to-purple-900/90 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>

        {/* Header Modernizado */}
        <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-white bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Eureca Tech
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-8">
                <a href="#services" className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 transform">
                  Serviços
                </a>
                <a href="#about" className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 transform">
                  Sobre
                </a>
                <a href="#contact" className="text-white/80 hover:text-white transition-all duration-300 hover:scale-105 transform">
                  Contato
                </a>
              </nav>

              <div className="flex items-center gap-4">
                <Link to="/downloads">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-900 backdrop-blur-sm transition-all duration-300 hidden sm:flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Downloads
                  </Button>
                </Link>
                <Link to="/sign-in">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-900 backdrop-blur-sm transition-all duration-300">
                    Metrics
                  </Button>
                </Link>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section com Efeitos Visuais */}
        <section className="container mx-auto px-6 py-20 text-center relative overflow-hidden">
          {/* Efeitos de brilho no fundo */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

          <div className="relative z-10">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Consultoria em <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-blue-300 to-teal-300 animate-gradient">
                Informática Essencial
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto leading-relaxed backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
              Soluções completas em tecnologia: suporte técnico, automação comercial,
              treinamentos e muito mais. Deixe a TI conosco e foque no seu negócio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="group">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                  🚀 Falar com Especialista
                </Button>
              </a>
              <a href="#services" className="group">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 text-lg font-semibold backdrop-blur-sm bg-white/10 hover:bg-white transition-all duration-300 transform hover:scale-105">
                  💡 Conhecer Serviços
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Problems Section Modernizada */}
        <section className="bg-gray-50/95 backdrop-blur-sm py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Problemas comuns que <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">resolvemos</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Identificamos e solucionamos os principais desafios de TI que afetam sua empresa
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: '🔧',
                  title: 'Problemas de Hardware',
                  description: 'Computadores lentos, impressoras com defeito, redes instáveis? Resolvemos problemas técnicos rapidamente.',
                  color: 'red'
                },
                {
                  icon: '🖥️',
                  title: 'Sistemas Windows',
                  description: 'Atualizações, configurações, migrações e otimização de sistemas Windows, máquinas virtuais e suporte básico a outros sistemas.',
                  color: 'blue'
                },
                {
                  icon: '⚡',
                  title: 'Automação Comercial',
                  description: 'Implementação e suporte para sistemas de automação comercial, PDV, emissão de NFC-e, SAT e muito mais.',
                  color: 'green'
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl hover:scale-105 transform transition-all duration-300 cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10">
                    <div className={`text-4xl mb-4 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section - Plano Cuidado Total */}
        <section id="services" className="bg-white py-20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Plano <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Cuidado Total</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Nos tornamos responsáveis pela TI da sua empresa, garantindo tranquilidade
                e eficiência para você focar no que realmente importa
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: '☁️',
                  title: 'Backup e Segurança',
                  description: 'Seus dados protegidos na nuvem contra vírus, falhas de equipamentos e erros operacionais. Acesse de qualquer lugar com total segurança.',
                  color: 'blue'
                },
                {
                  icon: '🔧',
                  title: 'Suporte Técnico',
                  description: 'Suporte remoto e presencial para hardware, software, redes e sistemas. Resposta rápida para minimizar downtime.',
                  color: 'green'
                },
                {
                  icon: '🛡️',
                  title: 'Manutenção Preventiva',
                  description: 'Limpezas agendadas, atualizações regulares, monitoramento proativo e correção preventiva de problemas.',
                  color: 'orange'
                },
                {
                  icon: '🎓',
                  title: 'Treinamentos',
                  description: 'Capacitação da sua equipe em sistemas, segurança digital e melhores práticas de tecnologia para aumentar a produtividade.',
                  color: 'purple'
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-200 hover:shadow-2xl hover:scale-105 transform transition-all duration-300 cursor-pointer group"
                >
                  <div className="text-3xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 group-hover:text-gray-700 transition-colors">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section Atualizada */}
        <section className="bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/10 to-transparent"></div>

          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para transformar a TI da sua empresa?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Conheça o Plano Cuidado Total e tenha toda a infraestrutura de TI
              da sua empresa gerenciada por especialistas.
            </p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-block group">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300">
                📞 Falar com Consultor
              </Button>
            </a>
          </div>
        </section>

        {/* About Section Modernizada */}
        <section id="about" className="bg-gray-50 py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-blue-50/30"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  Por que escolher a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Eureca Tech</span>?
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Há 6 anos no mercado de tecnologia, desenvolvemos expertise para entender
                  que cada empresa tem necessidades únicas. Oferecemos soluções personalizadas
                  que resolvem os problemas reais de TI do seu negócio com agilidade e eficiência.
                </p>
                <div className="space-y-4">
                  {[
                    'Resposta rápida para emergências',
                    '6 anos de experiência comprovada',
                    'Soluções sob medida',
                    'Suporte contínuo e preventivo'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-300">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-200 hover:shadow-3xl transition-all duration-300">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Nossas Especialidades</h3>
                <div className="space-y-4">
                  {[
                    'Suporte em Hardware',
                    'Sistemas Windows',
                    'Automação Comercial',
                    'Redes e Conectividade',
                    'Câmeras de Segurança',
                    'Análise de Sistemas',
                    'Máquinas Virtuais',
                    'Suporte Básico Linux/Mac'
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0 group hover:bg-gray-50 rounded-lg px-2 transition-colors duration-200">
                      <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                        {item}
                      </span>
                      <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium group-hover:scale-110 transition-transform duration-200">
                        ✓
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Atualizado */}
        <footer id="contact" className="bg-gray-900 text-white py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"></div>

          <div className="container mx-auto px-6 relative z-10">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Eureca Tech
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  Especialistas em soluções tecnológicas para empresas que buscam
                  eficiência e crescimento através da tecnologia.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 text-white">Contato</h3>
                <div className="text-gray-400 space-y-3">
                  <p className="hover:text-white transition-colors duration-300 cursor-pointer">📧 thofurtado@gmail.com</p>
                  <p className="hover:text-white transition-colors duration-300 cursor-pointer">📱 (12) 99219-3644</p>
                  <p className="hover:text-white transition-colors duration-300 cursor-pointer">
                    📍 Rua Tatsuo Matsumoto 180, Capricórnio II<br />Caraguátatuba - SP
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 text-white">Acesso Rápido</h3>
                <div className="text-gray-400 space-y-3">
                  <a href="#services" className="block hover:text-white transition-all duration-300 hover:translate-x-2 transform">
                    Nossos Serviços
                  </a>
                  <a href="#about" className="block hover:text-white transition-all duration-300 hover:translate-x-2 transform">
                    Sobre Nós
                  </a>
                  <Link to="/sign-in" className="block hover:text-white transition-all duration-300 hover:translate-x-2 transform">
                    Login Metrics
                  </Link>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-all duration-300 hover:translate-x-2 transform">
                    Suporte Rápido
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
              <p>&copy; 2020 Eureca Tech. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Adicione este estilo no seu arquivo CSS global ou usando uma tag style */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 6s ease infinite;
        }
      `}</style>
    </>
  )
}