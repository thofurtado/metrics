// pages/landing-page.tsx
import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

import { ParticleBackground } from '../../../components/three/ParticleBackground'
import { Button } from '../../../components/ui/button'

export default function EurecaLanding() {
  const whatsappMessage =
    'Olá! Gostaria de saber mais sobre o Plano Cuidado Total para minha empresa.'
  const whatsappLink = `https://wa.me/5512992193644?text=${encodeURIComponent(whatsappMessage)}`
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <>
      <Helmet>
        <title>Eureca Tech - Consultoria em Informática Essencial</title>
        <meta
          name="description"
          content="Soluções completas em TI: suporte técnico, consultoria, automação comercial e treinamentos. Plano Cuidado Total para sua empresa."
        />
      </Helmet>

      {/* Background com Partículas 3D */}
      <ParticleBackground />

      <div
        className={`min-h-screen bg-gradient-to-br from-blue-900/90 via-teal-800/90 to-purple-900/90 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Header Modernizado */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg">
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
              </div>

              <nav className="hidden items-center gap-8 md:flex">
                <a
                  href="#services"
                  className="transform text-white/80 transition-all duration-300 hover:scale-105 hover:text-white"
                >
                  Serviços
                </a>
                <a
                  href="#about"
                  className="transform text-white/80 transition-all duration-300 hover:scale-105 hover:text-white"
                >
                  Sobre
                </a>
                <a
                  href="#contact"
                  className="transform text-white/80 transition-all duration-300 hover:scale-105 hover:text-white"
                >
                  Contato
                </a>
              </nav>

              <div className="flex items-center gap-4">
                <Link to="/downloads">
                  <Button
                    variant="outline"
                    className="hidden items-center gap-2 border-white bg-transparent text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-blue-900 sm:flex"
                  >
                    <Download className="h-4 w-4" />
                    Downloads
                  </Button>
                </Link>
                <Link to="/sign-in">
                  <Button
                    variant="outline"
                    className="border-white bg-transparent text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-blue-900"
                  >
                    Metrics
                  </Button>
                </Link>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-green-600 text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-green-700 hover:shadow-xl">
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section com Efeitos Visuais */}
        <section className="container relative mx-auto overflow-hidden px-6 py-20 text-center">
          {/* Efeitos de brilho no fundo */}
          <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 h-80 w-80 animate-pulse rounded-full bg-blue-500/10 blur-3xl delay-1000"></div>

          <div className="relative z-10">
            <h1 className="mb-6 text-5xl font-bold leading-tight text-white md:text-7xl">
              Consultoria em <br />
              <span className="animate-gradient bg-gradient-to-r from-purple-300 via-blue-300 to-teal-300 bg-clip-text text-transparent">
                Informática Essencial
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6 text-xl leading-relaxed text-white/80 backdrop-blur-sm md:text-2xl">
              Soluções completas em tecnologia: suporte técnico, automação
              comercial, treinamentos e muito mais. Deixe a TI conosco e foque
              no seu negócio.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Button
                  size="lg"
                  className="hover:shadow-3xl transform bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:from-purple-700 hover:to-blue-700"
                >
                  🚀 Falar com Especialista
                </Button>
              </a>
              <a href="#services" className="group">
                <Button
                  size="lg"
                  variant="outline"
                  className="transform border-2 border-white bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-white hover:bg-white hover:text-blue-900"
                >
                  💡 Conhecer Serviços
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Problems Section Modernizada */}
        <section className="relative bg-gray-50/95 py-20 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>

          <div className="container relative z-10 mx-auto px-6">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                Problemas comuns que{' '}
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  resolvemos
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-xl text-gray-600">
                Identificamos e solucionamos os principais desafios de TI que
                afetam sua empresa
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '🔧',
                  title: 'Problemas de Hardware',
                  description:
                    'Computadores lentos, impressoras com defeito, redes instáveis? Resolvemos problemas técnicos rapidamente.',
                  color: 'red',
                },
                {
                  icon: '🖥️',
                  title: 'Sistemas Windows',
                  description:
                    'Atualizações, configurações, migrações e otimização de sistemas Windows, máquinas virtuais e suporte básico a outros sistemas.',
                  color: 'blue',
                },
                {
                  icon: '⚡',
                  title: 'Automação Comercial',
                  description:
                    'Implementação e suporte para sistemas de automação comercial, PDV, emissão de NFC-e, SAT e muito mais.',
                  color: 'green',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group relative transform cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative z-10">
                    <div
                      className={`mb-4 transform text-4xl transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110`}
                    >
                      {item.icon}
                    </div>
                    <h3 className="mb-4 text-xl font-semibold text-gray-900 transition-colors duration-300 group-hover:text-gray-800">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 transition-colors duration-300 group-hover:text-gray-700">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Services Section - Plano Cuidado Total */}
        <section
          id="services"
          className="relative overflow-hidden bg-white py-20"
        >
          <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-gray-50 to-transparent"></div>

          <div className="container relative z-10 mx-auto px-6">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
                Plano{' '}
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Cuidado Total
                </span>
              </h2>
              <p className="mx-auto max-w-2xl text-xl text-gray-600">
                Nos tornamos responsáveis pela TI da sua empresa, garantindo
                tranquilidade e eficiência para você focar no que realmente
                importa
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: '☁️',
                  title: 'Backup e Segurança',
                  description:
                    'Seus dados protegidos na nuvem contra vírus, falhas de equipamentos e erros operacionais. Acesse de qualquer lugar com total segurança.',
                  color: 'blue',
                },
                {
                  icon: '🔧',
                  title: 'Suporte Técnico',
                  description:
                    'Suporte remoto e presencial para hardware, software, redes e sistemas. Resposta rápida para minimizar downtime.',
                  color: 'green',
                },
                {
                  icon: '🛡️',
                  title: 'Manutenção Preventiva',
                  description:
                    'Limpezas agendadas, atualizações regulares, monitoramento proativo e correção preventiva de problemas.',
                  color: 'orange',
                },
                {
                  icon: '🎓',
                  title: 'Treinamentos',
                  description:
                    'Capacitação da sua equipe em sistemas, segurança digital e melhores práticas de tecnologia para aumentar a produtividade.',
                  color: 'purple',
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="group transform cursor-pointer rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                >
                  <div className="mb-4 transform text-3xl transition-transform duration-300 group-hover:scale-110">
                    {item.icon}
                  </div>
                  <h3 className="mb-4 text-xl font-semibold text-gray-900 transition-colors group-hover:text-gray-800">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 transition-colors group-hover:text-gray-700">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section Atualizada */}
        <section className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 py-20">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-white/10 to-transparent"></div>

          <div className="container relative z-10 mx-auto px-6 text-center">
            <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
              Pronto para transformar a TI da sua empresa?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-white/90">
              Conheça o Plano Cuidado Total e tenha toda a infraestrutura de TI
              da sua empresa gerenciada por especialistas.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-block"
            >
              <Button
                size="lg"
                className="hover:shadow-3xl transform bg-white px-8 py-4 text-lg font-semibold text-purple-600 shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-gray-100"
              >
                📞 Falar com Consultor
              </Button>
            </a>
          </div>
        </section>

        {/* About Section Modernizada */}
        <section id="about" className="relative bg-gray-50 py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-blue-50/30"></div>

          <div className="container relative z-10 mx-auto px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
                  Por que escolher a{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Eureca Tech
                  </span>
                  ?
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-gray-600">
                  Há 6 anos no mercado de tecnologia, desenvolvemos expertise
                  para entender que cada empresa tem necessidades únicas.
                  Oferecemos soluções personalizadas que resolvem os problemas
                  reais de TI do seu negócio com agilidade e eficiência.
                </p>
                <div className="space-y-4">
                  {[
                    'Resposta rápida para emergências',
                    '6 anos de experiência comprovada',
                    'Soluções sob medida',
                    'Suporte contínuo e preventivo',
                  ].map((item, index) => (
                    <div key={index} className="group flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <span className="font-medium text-gray-700 transition-colors duration-300 group-hover:text-gray-900">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hover:shadow-3xl rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl transition-all duration-300">
                <h3 className="mb-6 text-2xl font-bold text-gray-900">
                  Nossas Especialidades
                </h3>
                <div className="space-y-4">
                  {[
                    'Suporte em Hardware',
                    'Sistemas Windows',
                    'Automação Comercial',
                    'Redes e Conectividade',
                    'Câmeras de Segurança',
                    'Análise de Sistemas',
                    'Máquinas Virtuais',
                    'Suporte Básico Linux/Mac',
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="group flex items-center justify-between rounded-lg border-b border-gray-200 px-2 py-3 transition-colors duration-200 last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="text-gray-700 transition-colors duration-200 group-hover:text-gray-900">
                        {item}
                      </span>
                      <span className="rounded-full bg-gradient-to-r from-blue-100 to-purple-100 px-3 py-1 text-sm font-medium text-blue-800 transition-transform duration-200 group-hover:scale-110">
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
        <footer
          id="contact"
          className="relative overflow-hidden bg-gray-900 py-16 text-white"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900"></div>

          <div className="container relative z-10 mx-auto px-6">
            <div className="grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="mb-4 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-2xl font-bold text-transparent">
                  Eureca Tech
                </h3>
                <p className="leading-relaxed text-gray-400">
                  Especialistas em soluções tecnológicas para empresas que
                  buscam eficiência e crescimento através da tecnologia.
                </p>
              </div>

              <div>
                <h3 className="mb-4 text-xl font-bold text-white">Contato</h3>
                <div className="space-y-3 text-gray-400">
                  <p className="cursor-pointer transition-colors duration-300 hover:text-white">
                    📧 thofurtado@gmail.com
                  </p>
                  <p className="cursor-pointer transition-colors duration-300 hover:text-white">
                    📱 (12) 99219-3644
                  </p>
                  <p className="cursor-pointer transition-colors duration-300 hover:text-white">
                    📍 Rua Tatsuo Matsumoto 180, Capricórnio II
                    <br />
                    Caraguátatuba - SP
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-xl font-bold text-white">
                  Acesso Rápido
                </h3>
                <div className="space-y-3 text-gray-400">
                  <a
                    href="#services"
                    className="block transform transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    Nossos Serviços
                  </a>
                  <a
                    href="#about"
                    className="block transform transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    Sobre Nós
                  </a>
                  <Link
                    to="/sign-in"
                    className="block transform transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    Login Metrics
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transform transition-all duration-300 hover:translate-x-2 hover:text-white"
                  >
                    Suporte Rápido
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-800 pt-8 text-center text-gray-400">
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
