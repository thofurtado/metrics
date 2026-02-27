import { Link } from 'react-router-dom'
import { TENANTS_CONFIG } from '../../../config/tenants'
import { useState } from 'react'
import { Lock } from 'lucide-react'

export default function MarujoLanding() {
    // Forçamos o tenant do Marujo pois esta é a Landing específica dele
    const tenant = TENANTS_CONFIG['metrics-two-gamma.vercel.app']
    const [logoError, setLogoError] = useState(false)

    const heroItems = [
        { title: "Palmito Caiçara", image: "/assets/marujo/Palmito%20%C3%A0%20Cai%C3%A7ara.jpg" },
        { title: "Sereníssima", image: "/assets/marujo/Serenissima.jpg" },
        { title: "Sororoca Mediterrâneo", image: "/assets/marujo/Sororoca%20Mediterraneo.jpg" },
    ]

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 to-black text-stone-200 font-sans">
            <header className="p-4 sm:p-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md">
                <div className="w-1/4 sm:w-1/3"></div>

                <div className="flex flex-col items-center gap-2 w-2/4 sm:w-1/3">
                    {!logoError ? (
                        <img
                            src={tenant.logo}
                            alt={`Logo de ${tenant.name}`}
                            className="h-14 sm:h-20 object-contain drop-shadow-xl"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <h1 className="text-3xl sm:text-4xl font-bold text-primary tracking-wider drop-shadow-md text-center" style={{ fontFamily: '"Pirata One", cursive' }}>
                            {tenant.name}
                        </h1>
                    )}
                </div>

                <div className="w-1/4 sm:w-1/3 flex justify-end pr-2 sm:pr-0">
                    <Link to="/sign-in" className="flex items-center gap-2 text-stone-200 bg-amber-600/20 hover:bg-amber-600/40 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors border border-amber-600/30 shadow-md" title="Acesso ao Sistema">
                        <Lock size={16} className="text-amber-500" />
                        <span className="hidden sm:inline font-bold text-amber-500" style={{ fontFamily: '"Cinzel", serif' }}>Acesso Restrito</span>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-20 flex flex-col items-center">
                <section className="text-center mb-16 space-y-6">
                    <h2 className="text-5xl md:text-7xl text-amber-500 font-bold drop-shadow-lg" style={{ fontFamily: '"Pirata One", cursive' }}>
                        Tricampeão do Caraguá a Gosto
                    </h2>
                    <p className="max-w-2xl mx-auto text-xl text-stone-300 font-medium tracking-wide">
                        Uma imersão rústica e pirata para o seu paladar. Venha explorar os mares revoltos de sabores incríveis e pratos premiados no melhor Gastro Bar da região!
                    </p>
                </section>

                <section className="w-full max-w-5xl mb-24 overflow-hidden relative">
                    <div className="flex flex-nowrap justify-center gap-6 pb-8 px-4 flex-col sm:flex-row items-center">
                        {heroItems.map((item, index) => (
                            <div
                                key={index}
                                className="w-full sm:w-80 h-96 rounded-2xl bg-stone-900/50 backdrop-blur-sm shadow-2xl flex items-center justify-center relative overflow-hidden group hover:-translate-y-2 hover:shadow-amber-500/20 transition-all duration-300 border border-white/10"
                            >
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent opacity-90"></div>
                                <span className="absolute bottom-8 text-2xl text-stone-100 font-bold drop-shadow-lg group-hover:scale-105 transition-transform text-center px-4" style={{ fontFamily: '"Cinzel", serif' }}>{item.title}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="text-center pb-20">
                    <Link to="/cardapio">
                        <button
                            className="bg-gradient-to-r from-stone-800 to-stone-900 text-amber-500 text-2xl sm:text-3xl font-bold px-12 py-5 rounded-xl shadow-2xl transform transition-transform hover:-translate-y-1 hover:shadow-amber-500/20 border border-amber-600/30"
                            style={{ fontFamily: '"Cinzel", serif' }}
                        >
                            Faça seu pedido
                        </button>
                    </Link>
                </section>
            </main>
        </div>
    )
}
