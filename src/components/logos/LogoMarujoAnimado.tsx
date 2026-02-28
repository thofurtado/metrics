import React from 'react';
import { motion } from 'framer-motion';

interface LogoMarujoAnimadoProps {
    className?: string;
    style?: React.CSSProperties;
}

export const LogoMarujoAnimado: React.FC<LogoMarujoAnimadoProps> = ({ className = "", style = {} }) => {
    // Configuração da animação para um efeito de "desenho" suave e sincronizado
    const draw = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: (i: number) => {
            const delay = 0.2 + i * 0.15; // Atraso escalonado para cada parte
            return {
                pathLength: 1,
                opacity: 1,
                transition: {
                    pathLength: { delay, type: "spring", duration: 2.5, bounce: 0 },
                    opacity: { delay, duration: 0.5 }
                }
            };
        }
    };

    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 250" // ViewBox largo para o layout horizontal
            className={className}
            style={style}
            initial="hidden"
            animate="visible"
        >
            <defs>
                {/* Gradiente dourado metálico para preenchimento e contorno */}
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#BF953F' }} />
                    <stop offset="25%" style={{ stopColor: '#FCF6BA' }} />
                    <stop offset="50%" style={{ stopColor: '#B38728' }} />
                    <stop offset="75%" style={{ stopColor: '#FBF5B7' }} />
                    <stop offset="100%" style={{ stopColor: '#AA771C' }} />
                </linearGradient>
                {/* Sombra suave para dar profundidade */}
                <filter id="dropShadow">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
                    <feOffset in="blur" dx="2" dy="3" result="offsetBlur" />
                    <feMerge>
                        <feMergeNode in="offsetBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <g fill="url(#goldGradient)" stroke="url(#goldGradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#dropShadow)">
                {/* 1. Chapéu Pirata com Chef Hat e Caveira */}
                <motion.path
                    d="M120,130 C100,125 80,110 75,90 C85,95 95,98 105,95 L110,70 C105,65 102,58 105,50 C108,42 115,38 122,35 C115,32 112,25 115,18 C120,10 130,8 140,10 C150,8 160,10 165,18 C168,25 165,32 158,35 C165,38 172,42 175,50 C178,58 175,65 170,70 L175,95 C185,98 195,95 205,90 C200,110 180,125 160,130 Z M128,75 L152,75 L140,58 Z M135,45 A5,5 0 1,0 145,45 A5,5 0 1,0 135,45 Z"
                    variants={draw} custom={0}
                />
                {/* Detalhes do lenço */}
                <motion.path d="M75,90 L70,110 M75,92 L80,112" variants={draw} custom={0.5} strokeWidth="2" />

                {/* 2. Texto Principal "MARUJO" (letras vetoriais complexas para replicar a fonte) */}
                <motion.path d="M220,145 L215,50 L245,50 L255,90 L265,50 L295,50 L290,145 L270,145 L275,110 L260,65 L245,110 L250,145 Z" variants={draw} custom={1} /> {/* M */}
                <motion.path d="M305,145 L325,50 L355,50 L365,145 L345,145 L342,115 L322,115 L319,145 Z M332,80 L325,100 L340,100 Z" variants={draw} custom={1.2} /> {/* A */}
                <motion.path d="M375,145 L380,50 L415,50 C435,50 445,65 440,85 C435,100 425,110 405,110 L425,145 L400,145 L385,110 L390,110 L395,70 L410,70 C420,70 425,65 428,58 C425,65 420,70 410,70 Z" variants={draw} custom={1.4} /> {/* R */}
                <motion.path d="M455,145 L460,50 L485,50 L480,120 C480,135 495,145 510,140 C525,135 530,120 535,105 L540,50 L565,50 L560,110 C555,135 540,155 510,160 C480,155 460,135 455,110 Z" variants={draw} custom={1.6} /> {/* U */}
                <motion.path d="M585,145 L590,50 L635,50 L630,75 L615,75 L610,120 L630,120 C645,120 655,110 660,95 L635,95 L640,75 L675,75 L665,120 C655,140 635,145 610,145 Z" variants={draw} custom={1.8} /> {/* J */}
                {/* Copo de Coquetel Integrado (Letra 'O' e ícone) */}
                <g>
                    <motion.path d="M880,50 L940,50 L910,95 L910,135 L895,135 L925,135 M910,95 L910,135" variants={draw} custom={3} strokeWidth="3" fill="none" />
                    <motion.path d="M940,50 A15,15 0 1,1 940,20 A15,15 0 1,1 940,50 Z M940,35 L940,20 M925,35 L955,35" variants={draw} custom={3.2} strokeWidth="2" fill="none" />
                    <motion.path d="M920,40 L900,25" variants={draw} custom={3.4} strokeWidth="2" fill="none" />
                </g>

                {/* 3. Texto Secundário "GASTRO BAR" */}
                <motion.path d="M480,185 L485,155 L500,155 L505,175 L525,175 L530,155 L545,155 L540,185 L525,185 L522,170 L508,170 L505,185 Z M515,162 L510,168 L520,168 Z" variants={draw} custom={2.2} /> {/* A */}
                <motion.path d="M555,185 L560,155 L585,155 L582,165 L568,165 L565,170 L580,170 C590,170 595,175 592,180 C590,185 580,185 570,185 Z" variants={draw} custom={2.4} /> {/* S */}
                <motion.path d="M605,185 L610,155 L635,155 L630,185 L615,185 L618,165 L632,165 L628,185 Z" variants={draw} custom={2.6} /> {/* T */}
                <motion.path d="M645,185 L650,155 L675,155 C690,155 695,165 690,175 C688,180 680,185 670,185 L660,185 L658,175 L670,175 C678,175 680,170 682,165 C680,170 678,175 670,175 Z" variants={draw} custom={2.8} /> {/* R */}
                <motion.path d="M705,170 C705,155 715,155 725,155 C735,155 745,155 745,170 C745,185 735,185 725,185 C715,185 705,185 705,170 Z M720,170 C720,178 722,178 730,178 C738,178 740,178 740,170 C740,162 738,162 730,162 C722,162 720,162 720,170 Z" variants={draw} custom={3.0} /> {/* O */}
                <motion.path d="M765,185 L770,155 L795,155 C805,155 810,160 808,165 C805,170 800,172 795,172 C800,172 805,175 802,180 C800,185 790,185 780,185 Z M782,162 L780,168 L790,168 C795,168 798,165 798,162 Z M778,175 L775,182 L790,182 C795,182 798,178 798,175 Z" variants={draw} custom={3.2} /> {/* B */}
                <motion.path d="M820,185 L825,155 L840,155 L845,175 L865,175 L870,155 L885,155 L880,185 L865,185 L862,170 L848,170 L845,185 Z M855,162 L850,168 L860,168 Z" variants={draw} custom={3.4} /> {/* A */}
                <motion.path d="M895,185 L900,155 L925,155 C940,155 945,165 940,175 C938,180 930,185 920,185 L910,185 L908,175 L920,175 C928,175 930,170 932,165 C930,170 928,175 920,175 Z" variants={draw} custom={3.6} /> {/* R */}

                {/* 4. Onda/Corda Inferior com textura de corda */}
                <motion.path
                    d="M220,210 Q400,190 600,210 T950,200"
                    variants={draw} custom={4}
                    strokeWidth="5" fill="none" strokeDasharray="10 4"
                />
            </g>
        </motion.svg>
    );
};