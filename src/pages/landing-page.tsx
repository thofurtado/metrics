// pages/landing-page.tsx
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'

export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>Eureca Tech - Sistema Metrics</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-teal-800 to-purple-900">
        {/* Header */}
        <header className="border-b border-white/10">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                    Entrar
                  </Button>
                </Link>
                <Link to="/sign-up">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    Cadastrar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Sistema <span className="text-purple-300">Metrics</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
            Controle total do seu negócio com insights valiosos para impulsionar sua empresa. 
            Análises em tempo real, relatórios detalhados e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/sign-up">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
                Começar Agora
              </Button>
            </Link>
            <Link to="/sign-in">
              <Button size="lg" variant="outline" className="border-white text-blue-400 hover:bg-white hover:text-blue-900 px-8 py-3 text-lg">
                Fazer Login
              </Button>
            </Link>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="bg-white py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Plano Cuidado Total</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Soluções completas para proteger e otimizar seus sistemas e dados
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Dados Disponíveis */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Dados Disponíveis</h3>
                <p className="text-gray-600">
                  Seus dados na nuvem protegidos contra vírus, falhas de equipamentos e erros operacionais. 
                  Acesse de qualquer lugar!
                </p>
              </div>

              {/* Sistemas Seguros */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Sistemas Seguros</h3>
                <p className="text-gray-600">
                  Sistemas operacionais atualizados com as melhores práticas de proteção 
                  contra vírus do mercado.
                </p>
              </div>

              {/* Manutenção */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-orange-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Manutenção</h3>
                <p className="text-gray-600">
                  Limpezas agendadas e periódicas, correção de erros de sistema 
                  e atualizações regulares.
                </p>
              </div>

              {/* Consultoria */}
              <div className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Consultoria</h3>
                <p className="text-gray-600">
                  Análise de mercado, técnicas atualizadas e treinamentos 
                  específicos para sua equipe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto para transformar seu negócio?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já utilizam o Metrics para otimizar seus processos.
            </p>
            <Link to="/sign-up">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
                Começar Agora Gratuitamente
              </Button>
            </Link>
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
                  eficiência e crescimento.
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
                  <Link to="/sign-in" className="block hover:text-white transition-colors">TeamViewer</Link>
                  <Link to="/sign-in" className="block hover:text-white transition-colors">Programas</Link>
                  <Link to="/sign-in" className="block hover:text-white transition-colors">Painel de Clientes</Link>
                  <Link to="/sign-in" className="block hover:text-white transition-colors">Suporte</Link>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Eureca Tech. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}