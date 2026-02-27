import { Link } from 'react-router-dom'
import { TENANTS_CONFIG } from '../../../config/tenants'
import { useState } from 'react'
import { Lock } from 'lucide-react'

const AntiqueCompass = () => (
    <div className="absolute top-0 left-0 w-full h-[800px] sm:h-screen overflow-hidden pointer-events-none -z-10 flex items-center justify-center">
        <div className="relative flex items-center justify-center w-[150vw] h-[150vw] sm:w-[1400px] sm:h-[1400px] opacity-20 mix-blend-soft-light text-amber-500">
            {/* Outer Ring - Spins Clockwise Very Slowly */}
            <svg viewBox="0 0 100 100" className="absolute w-full h-full animate-[spin_240s_linear_infinite] fill-current">
                <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.3" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1 1.5" />
                <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="0.1" />

                {Array.from({ length: 72 }).map((_, i) => (
                    <line key={`tick-${i}`} x1="50" y1="2" x2="50" y2={i % 9 === 0 ? "6" : "4"} transform={`rotate(${i * 5} 50 50)`} stroke="currentColor" strokeWidth={i % 9 === 0 ? "0.5" : "0.2"} />
                ))}

                <text x="50" y="10" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel" fill="currentColor" fontWeight="bold">N</text>
                <text x="50" y="93" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel" fill="currentColor" fontWeight="bold">S</text>
                <text x="93" y="52" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel" fill="currentColor" fontWeight="bold">E</text>
                <text x="7" y="52" textAnchor="middle" fontSize="4.5" fontFamily="Cinzel" fill="currentColor" fontWeight="bold">W</text>
            </svg>

            {/* Inner Star - Spins Counter-Clockwise Faster */}
            <svg viewBox="0 0 100 100" className="absolute w-[80%] h-[80%] animate-[spin_180s_linear_infinite_reverse] fill-current">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="2 4" />
                <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.1" />

                <g transform="translate(50, 50)">
                    {/* Background faint ray burst */}
                    <g opacity="0.15">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <path key={`p${i}`} d="M0 -38 L1.5 -10 L0 0 Z" transform={`rotate(${i * 22.5})`} fill="currentColor" />
                        ))}
                    </g>

                    {/* Minor points */}
                    <g transform="rotate(45)">
                        <path d="M0 -30 L3 -6 L0 0 Z" fill="currentColor" opacity="0.3" />
                        <path d="M0 -30 L-3 -6 L0 0 Z" fill="currentColor" opacity="0.6" />
                        <path d="M0 30 L3 6 L0 0 Z" fill="currentColor" opacity="0.6" />
                        <path d="M0 30 L-3 6 L0 0 Z" fill="currentColor" opacity="0.3" />
                        <path d="M30 0 L6 3 L0 0 Z" fill="currentColor" opacity="0.3" />
                        <path d="M30 0 L6 -3 L0 0 Z" fill="currentColor" opacity="0.6" />
                        <path d="M-30 0 L-6 3 L0 0 Z" fill="currentColor" opacity="0.6" />
                        <path d="M-30 0 L-6 -3 L0 0 Z" fill="currentColor" opacity="0.3" />
                    </g>

                    {/* Major points */}
                    <path d="M0 -40 L4.5 -8 L0 0 Z" fill="currentColor" opacity="0.4" />
                    <path d="M0 -40 L-4.5 -8 L0 0 Z" fill="currentColor" opacity="0.9" />
                    <path d="M0 40 L4.5 8 L0 0 Z" fill="currentColor" opacity="0.9" />
                    <path d="M0 40 L-4.5 8 L0 0 Z" fill="currentColor" opacity="0.4" />
                    <path d="M40 0 L8 4.5 L0 0 Z" fill="currentColor" opacity="0.4" />
                    <path d="M40 0 L8 -4.5 L0 0 Z" fill="currentColor" opacity="0.9" />
                    <path d="M-40 0 L-8 4.5 L0 0 Z" fill="currentColor" opacity="0.9" />
                    <path d="M-40 0 L-8 -4.5 L0 0 Z" fill="currentColor" opacity="0.4" />
                </g>

                <circle cx="50" cy="50" r="5" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.8" />
            </svg>
        </div>
    </div>
)

export default function MarujoLanding() {
    // Forçamos o tenant do Marujo pois esta é a Landing específica dele
    const tenant = TENANTS_CONFIG['marujogastrobar.vercel.app']
    const [logoError, setLogoError] = useState(false)

    const heroItems = [
        { title: "Palmito Caiçara", image: "/assets/marujo/Palmito%20%C3%A0%20Cai%C3%A7ara.jpg" },
        { title: "Sereníssima", image: "/assets/marujo/Serenissima.jpg" },
        { title: "Sororoca Mediterrâneo", image: "/assets/marujo/Sororoca%20Mediterraneo.jpg" },
    ]

    return (
        <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 to-black text-stone-200 font-sans z-0 overflow-hidden flex flex-col justify-between">
            <AntiqueCompass />

            <header className="p-4 sm:p-6 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-md relative z-10 shrink-0">
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

            <main className="container mx-auto px-4 pt-12 pb-16 md:pt-8 md:pb-8 flex-1 flex flex-col items-center justify-center relative z-10">
                <section className="text-center mb-12 md:mb-6 space-y-6 md:space-y-3">
                    <h2 className="text-5xl md:text-7xl text-amber-500 font-bold drop-shadow-lg" style={{ fontFamily: '"Pirata One", cursive' }}>
                        Tricampeão do Caraguá a Gosto
                    </h2>
                    <p className="max-w-3xl mx-auto text-lg sm:text-xl text-stone-300 font-medium tracking-wide">
                        Alta gastronomia, clima litorâneo e uma experiência inesquecível para toda a família. Saboreie nossos pratos premiados no ambiente mais charmoso e rústico de Caraguatatuba, enquanto as crianças se divertem em nosso Espaço Kids completo, com fliperamas e escorregador gigante.
                    </p>
                </section>

                <section className="w-full max-w-5xl mb-16 md:mb-6 overflow-hidden relative shrink-0">
                    <div className="flex flex-nowrap justify-center gap-6 md:gap-4 pb-4 md:pb-2 px-4 flex-col sm:flex-row items-center">
                        {heroItems.map((item, index) => (
                            <div
                                key={index}
                                data-testid={`carousel-item-${index}`}
                                className="w-full sm:w-80 h-80 md:h-[18rem] lg:h-[20rem] rounded-2xl bg-stone-900/50 backdrop-blur-sm shadow-2xl flex items-center justify-center relative overflow-hidden group hover:-translate-y-2 hover:shadow-amber-500/20 transition-all duration-300 border border-white/10 shrink-0"
                            >
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent opacity-90"></div>
                                <span className="absolute bottom-6 md:bottom-8 text-xl md:text-2xl text-stone-100 font-bold drop-shadow-lg group-hover:scale-105 transition-transform text-center px-4" style={{ fontFamily: '"Cinzel", serif' }}>{item.title}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="text-center pb-8 md:pb-4">
                    <Link to="/cardapio">
                        <button
                            data-testid="main-cta-button"
                            className="bg-gradient-to-r from-stone-800 to-stone-900 text-amber-500 text-xl sm:text-2xl md:text-3xl font-bold px-10 py-4 md:px-12 md:py-5 rounded-xl shadow-2xl transform transition-transform hover:-translate-y-1 hover:shadow-amber-500/20 border border-amber-600/30"
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
