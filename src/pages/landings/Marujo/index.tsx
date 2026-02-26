import { Link } from 'react-router-dom'
import { TENANTS_CONFIG } from '../../../config/tenants'
import { useState } from 'react'
import { Lock } from 'lucide-react'

export default function MarujoLanding() {
    // Forçamos o tenant do Marujo pois esta é a Landing específica dele
    const tenant = TENANTS_CONFIG['metrics-two-gamma.vercel.app']
    const [logoError, setLogoError] = useState(false)

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#f5ebd8] via-[#e8d5b5] to-[#d4b88c] text-foreground font-sans">
            <header className="p-4 sm:p-6 flex items-center justify-between border-b border-border/20 bg-black/5 backdrop-blur-sm">
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
                    <Link to="/sign-in" className="flex items-center gap-2 text-white bg-orange-900/80 hover:bg-orange-800 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors border border-orange-900/50 shadow-md" title="Acesso ao Sistema">
                        <Lock size={16} />
                        <span className="hidden sm:inline font-bold" style={{ fontFamily: '"Cinzel", serif' }}>Acesso Restrito</span>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-20 flex flex-col items-center">
                <section className="text-center mb-16 space-y-6">
                    <h2 className="text-5xl md:text-7xl text-orange-900 font-bold drop-shadow-lg" style={{ fontFamily: '"Pirata One", cursive' }}>
                        Tricampeão do Caraguá a Gosto
                    </h2>
                    <p className="max-w-2xl mx-auto text-xl text-foreground/80 font-medium tracking-wide">
                        Uma imersão rústica e pirata para o seu paladar. Venha explorar os mares revoltos de sabores incríveis e pratos premiados no melhor Gastro Bar da região!
                    </p>
                </section>

                <section className="w-full max-w-5xl mb-24 overflow-hidden relative">
                    <div className="flex flex-nowrap overflow-x-auto gap-6 pb-8 snap-x snap-mandatory px-4" style={{ scrollbarWidth: 'none' }}>
                        {[1, 2, 3, 4, 5].map((item) => (
                            <div
                                key={item}
                                className="shrink-0 snap-center w-72 h-96 rounded-xl bg-white/40 backdrop-blur-sm shadow-xl flex items-center justify-center relative overflow-hidden group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 border border-white/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-900/80 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <span className="absolute bottom-6 text-3xl text-white font-bold drop-shadow-lg group-hover:scale-110 transition-transform" style={{ fontFamily: '"Cinzel", serif' }}>Destaque {item}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="text-center pb-20">
                    <Link to="/cardapio">
                        <button
                            className="bg-gradient-to-r from-orange-800 to-amber-600 text-white text-3xl font-bold px-12 py-5 rounded-lg shadow-2xl transform transition-transform hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border-b-4 border-orange-900"
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
