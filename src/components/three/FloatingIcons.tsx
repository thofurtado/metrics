// src/components/three/FloatingIcons.tsx
import { useEffect, useRef } from 'react'

interface FloatingIconsProps {
  className?: string
}

export function FloatingIcons({ className }: FloatingIconsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div 
      ref={containerRef} 
      className={className}
    >
      {/* Ícone SVG simples que pode ser substituído por 3D depois */}
      <svg 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        className="text-blue-600"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
  )
}