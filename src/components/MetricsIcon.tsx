export function MetricsIcon({ className = "", style = {} }: { className?: string, style?: any }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="-2 -2 28 28" 
      fill="none" 
      className={className}
      style={style}
    >
      <defs>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1E3A8A" floodOpacity="0.4" />
        </filter>

        <linearGradient id="borderGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="1" />
          <stop offset="100%" stopColor="#1E3A8A" stopOpacity="1" />
        </linearGradient>

        <linearGradient id="leftFaceGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0.6" />
        </linearGradient>

        <linearGradient id="rightFaceGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      <g filter="url(#dropShadow)">
        <path 
          d="M 12 2 L 3 17 L 12 22 Z" 
          fill="url(#leftFaceGrad)" 
          stroke="url(#borderGrad)" 
          strokeWidth="1.5" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 12 2 L 21 17 L 12 22 Z" 
          fill="url(#rightFaceGrad)" 
          stroke="url(#borderGrad)" 
          strokeWidth="1.5" 
          strokeLinejoin="round" 
        />
      </g>
    </svg>
  );
}
