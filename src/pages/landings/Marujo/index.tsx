import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LogoMarujo } from '../../../components/logos/LogoMarujo'

const AntiqueCompass = () => (
  <div className="pointer-events-none absolute left-0 top-0 -z-10 flex h-[800px] w-full items-center justify-center overflow-hidden sm:h-screen">
    <div className="relative flex h-[150vw] w-[150vw] items-center justify-center text-amber-500 opacity-20 mix-blend-soft-light sm:h-[1400px] sm:w-[1400px]">
      {/* Outer Ring - Spins Clockwise Very Slowly */}
      <svg
        viewBox="0 0 100 100"
        className="absolute h-full w-full animate-[spin_240s_linear_infinite] fill-current"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.2"
          strokeDasharray="1 1.5"
        />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.1"
        />

        {Array.from({ length: 72 }).map((_, i) => (
          <line
            key={`tick-${i}`}
            x1="50"
            y1="2"
            x2="50"
            y2={i % 9 === 0 ? '6' : '4'}
            transform={`rotate(${i * 5} 50 50)`}
            stroke="currentColor"
            strokeWidth={i % 9 === 0 ? '0.5' : '0.2'}
          />
        ))}

        <text
          x="50"
          y="10"
          textAnchor="middle"
          fontSize="4.5"
          fontFamily="Cinzel"
          fill="currentColor"
          fontWeight="bold"
        >
          N
        </text>
        <text
          x="50"
          y="93"
          textAnchor="middle"
          fontSize="4.5"
          fontFamily="Cinzel"
          fill="currentColor"
          fontWeight="bold"
        >
          S
        </text>
        <text
          x="93"
          y="52"
          textAnchor="middle"
          fontSize="4.5"
          fontFamily="Cinzel"
          fill="currentColor"
          fontWeight="bold"
        >
          E
        </text>
        <text
          x="7"
          y="52"
          textAnchor="middle"
          fontSize="4.5"
          fontFamily="Cinzel"
          fill="currentColor"
          fontWeight="bold"
        >
          W
        </text>
      </svg>

      {/* Inner Star - Spins Counter-Clockwise Faster */}
      <svg
        viewBox="0 0 100 100"
        className="absolute h-[80%] w-[80%] animate-[spin_180s_linear_infinite_reverse] fill-current"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeDasharray="2 4"
        />
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.1"
        />

        <g transform="translate(50, 50)">
          {/* Background faint ray burst */}
          <g opacity="0.15">
            {Array.from({ length: 16 }).map((_, i) => (
              <path
                key={`p${i}`}
                d="M0 -38 L1.5 -10 L0 0 Z"
                transform={`rotate(${i * 22.5})`}
                fill="currentColor"
              />
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

        <circle
          cx="50"
          cy="50"
          r="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
        />
        <circle cx="50" cy="50" r="2" fill="currentColor" opacity="0.8" />
      </svg>
    </div>
  </div>
)

export default function MarujoLanding() {
  const heroItems = [
    {
      title: 'Palmito Caiçara',
      image: '/assets/marujo/Palmito%20%C3%A0%20Cai%C3%A7ara.jpg',
    },
    { title: 'Sereníssima', image: '/assets/marujo/Serenissima.jpg' },
    {
      title: 'Sororoca Mediterrâneo',
      image: '/assets/marujo/Sororoca%20Mediterraneo.jpg',
    },
  ]

  return (
    <div className="relative z-0 flex min-h-screen flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-900 to-black font-sans text-stone-200">
      <AntiqueCompass />

      <header className="relative z-10 flex h-24 shrink-0 items-center justify-between border-b border-white/10 bg-black/40 px-4 py-6 backdrop-blur-md sm:h-28 sm:px-6 md:h-32">
        <div className="z-10 flex flex-1 justify-start"></div>

        {/* Logo Centralizado Absoluto */}
        <LogoMarujo />

        <div className="z-10 flex flex-1 justify-end pr-2 sm:pr-0">
          <Link
            to="/sign-in"
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-amber-600/30 bg-amber-600/20 px-3 py-2 text-stone-200 shadow-md transition-colors hover:bg-amber-600/40 sm:px-4 sm:py-2"
            title="Acesso ao Sistema"
          >
            <Lock size={16} className="text-amber-500" />
            <span
              className="hidden font-bold text-amber-500 sm:inline"
              style={{ fontFamily: '"Cinzel", serif' }}
            >
              Acesso Restrito
            </span>
          </Link>
        </div>
      </header>

      <main className="container relative z-10 mx-auto flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 md:pb-12 md:pt-12">
        {/* Título Principal */}
        <section className="mb-16 mt-12 w-full px-4 text-center md:mb-20 md:mt-16">
          <h1
            className="mb-8 bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-700 bg-clip-text text-4xl font-bold tracking-wide text-transparent drop-shadow-sm md:mb-12 md:text-5xl lg:text-6xl"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            7x Campeão do Caraguá a Gosto
          </h1>

          {/* Descrição com Alta Legibilidade */}
          <p className="text-lg font-normal leading-relaxed tracking-wide text-stone-200 drop-shadow-md sm:text-xl md:text-2xl">
            Alta gastronomia, clima litorâneo e uma experiência inesquecível
            para toda a família. Saboreie nossos pratos premiados no ambiente
            mais charmoso e rústico de Caraguatatuba, enquanto as crianças se
            divertem em nosso Espaço Kids completo.
          </p>
        </section>

        <section className="relative mb-16 w-full max-w-5xl shrink-0 overflow-hidden md:mb-6">
          <div className="flex flex-col flex-nowrap items-center justify-center gap-6 px-4 pb-4 sm:flex-row md:gap-4 md:pb-2">
            {heroItems.map((item, index) => (
              <div
                key={index}
                data-testid={`carousel-item-${index}`}
                className="group relative flex h-80 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-stone-900/50 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-amber-500/20 sm:w-80 md:h-[18rem] lg:h-[20rem]"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/40 to-transparent opacity-90"></div>
                <span
                  className="absolute bottom-6 px-4 text-center text-xl font-bold text-stone-100 drop-shadow-lg transition-transform group-hover:scale-105 md:bottom-8 md:text-2xl"
                  style={{ fontFamily: '"Cinzel", serif' }}
                >
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-8 text-center md:pb-4">
          <Link to="/cardapio">
            <button
              data-testid="main-cta-button"
              className="transform rounded-xl border border-amber-500/50 bg-gradient-to-br from-amber-700 to-amber-900 px-10 py-4 text-xl font-bold text-stone-100 shadow-2xl drop-shadow-[0_0_15px_rgba(217,119,6,0.3)] transition-all duration-300 hover:-translate-y-1 hover:from-amber-600 hover:to-amber-800 hover:drop-shadow-[0_0_25px_rgba(251,191,36,0.5)] sm:text-2xl md:px-12 md:py-5 md:text-3xl"
              style={{
                fontFamily: '"Cinzel", serif',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              Faça seu pedido
            </button>
          </Link>
        </section>
      </main>
    </div>
  )
}
