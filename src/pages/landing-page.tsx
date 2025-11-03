// pages/landing-page.tsx
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export function LandingPage() {
  const whatsappMessage = "Olá! Gostaria de saber mais sobre o Plano Cuidado Total para minha empresa."
  const whatsappLink = `https://wa.me/5512992193644?text=${encodeURIComponent(whatsappMessage)}`

  return (
    <>
      <Helmet>
        <title>Eureca Tech - Consultoria em Informática Essencial</title>
        <meta name="description" content="Soluções completas em TI: suporte técnico, consultoria, automação comercial e treinamentos. Plano Cuidado Total para sua empresa." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-teal-800 to-purple-900">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-2xl font-bold text-white">Eureca Tech</span>
              </div>

              <nav className="hidden md:flex items-center gap-8">
                <a href="#services" className="text-white/80 hover:text-white transition-colors">Serviços</a>
                <a href="#about" className="text-white/80 hover:text-white transition-colors">Sobre</a>
                <a href="#contact" className="text-white/80 hover:text-white transition-colors">Contato</a>
              </nav>

              <div className="flex items-center gap-4">
                <Link to="/sign-in">
                  <Button variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-900">
                    Entrar no Metrics
                  </Button>
                </Link>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Falar no WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Consultoria em <br /><span className="text-purple-300">Informática Essencial</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            Soluções completas em tecnologia: suporte técnico, automação comercial,
            treinamentos e muito mais. Deixe a TI conosco e foque no seu negócio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
                Falar com Especialista
              </Button>
            </a>
            <a href="#services">
              <Button size="lg" variant="outline" className="border-white text-blue-900 hover:bg-gray-100 hover:text-blue-900 px-8 py-3 text-lg bg-white">
                Conhecer Nossos Serviços
              </Button>
            </a>
          </div>
        </section>

        {/* Problems Section */}
        <section className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Problemas comuns que resolvemos
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Identificamos e solucionamos os principais desafios de TI que afetam sua empresa
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Problemas de Hardware</h3>
                <p className="text-gray-600">
                  Computadores lentos, impressoras com defeito, redes instáveis?
                  Resolvemos problemas técnicos rapidamente.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Sistemas Windows</h3>
                <p className="text-gray-600">
                  Atualizações, configurações, migrações e otimização de sistemas
                  Windows, máquinas virtuais e suporte básico a outros sistemas.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Automação Comercial</h3>
                <p className="text-gray-600">
                  Implementação e suporte para sistemas de automação comercial,
                  PDV, emissão de NFC-e, SAT e muito mais.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section - Plano Cuidado Total */}
        <section id="services" className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Plano <span className="text-purple-600">Cuidado Total</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Nos tornamos responsáveis pela TI da sua empresa, garantindo tranquilidade
                e eficiência para você focar no que realmente importa
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Backup e Segurança */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Backup e Segurança</h3>
                <p className="text-gray-600">
                  Seus dados protegidos na nuvem contra vírus, falhas de equipamentos
                  e erros operacionais. Acesse de qualquer lugar com total segurança.
                </p>
              </div>

              {/* Suporte Técnico */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Suporte Técnico</h3>
                <p className="text-gray-600">
                  Suporte remoto e presencial para hardware, software, redes e
                  sistemas. Resposta rápida para minimizar downtime.
                </p>
              </div>

              {/* Manutenção Preventiva */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Manutenção Preventiva</h3>
                <p className="text-gray-600">
                  Limpezas agendadas, atualizações regulares, monitoramento
                  proativo e correção preventiva de problemas.
                </p>
              </div>

              {/* Treinamentos */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow border border-gray-200">
                <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Treinamentos</h3>
                <p className="text-gray-600">
                  Capacitação da sua equipe em sistemas, segurança digital e
                  melhores práticas de tecnologia para aumentar a produtividade.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para transformar a TI da sua empresa?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Conheça o Plano Cuidado Total e tenha toda a infraestrutura de TI
              da sua empresa gerenciada por especialistas.
            </p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
                Falar com Consultor
              </Button>
            </a>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="bg-gray-50 py-20">
          <div className="container mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Por que escolher a <span className="text-purple-600">Eureca Tech</span>?
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Há 6 anos no mercado de tecnologia, desenvolvemos expertise para entender
                  que cada empresa tem necessidades únicas. Oferecemos soluções personalizadas
                  que resolvem os problemas reais de TI do seu negócio com agilidade e eficiência.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">Resposta rápida para emergências</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">6 anos de experiência comprovada</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">Soluções sob medida</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">Suporte contínuo e preventivo</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Nossas Especialidades</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Suporte em Hardware</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Sistemas Windows</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Automação Comercial</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Redes e Conectividade</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Câmeras de Segurança</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Análise de Sistemas</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700">Máquinas Virtuais</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-700">Suporte Básico Linux/Mac</span>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">Eureca Tech</h3>
                <p className="text-gray-400">
                  Especialistas em soluções tecnológicas para empresas que buscam
                  eficiência e crescimento através da tecnologia.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Contato</h3>
                <div className="text-gray-400 space-y-2">
                  <p>thofurtado@gmail.com</p>
                  <p>(12) 99219-3644</p>
                  <p>Rua Tatsuo Matsumoto 180, Capricórnio II<br />Caraguátatuba - SP</p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4">Acesso Rápido</h3>
                <div className="text-gray-400 space-y-2">
                  <a href="#services" className="block hover:text-white transition-colors">Nossos Serviços</a>
                  <a href="#about" className="block hover:text-white transition-colors">Sobre Nós</a>
                  <Link to="/sign-in" className="block hover:text-white transition-colors">Entrar no Metrics</Link>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">Suporte Rápido</a>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2020 Eureca Tech. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}