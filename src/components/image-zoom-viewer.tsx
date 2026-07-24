"use client"
import React, { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageZoomViewerProps {
  src: string
  alt?: string
  className?: string
  containerClassName?: string
}

export function ImageZoomViewer({ src, alt = "Comprovante", className = "", containerClassName = "" }: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom ao trocar de imagem
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [src])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4))
  }

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 1)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleReset = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    const delta = e.deltaY < 0 ? 0.25 : -0.25
    setScale(prev => {
      const next = Math.min(Math.max(prev + delta, 1), 4)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    e.preventDefault()
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset()
    } else {
      setScale(2)
    }
  }

  const handleOpenNewTab = () => {
    window.open(src, '_blank')
  }

  return (
    <div className={`relative flex flex-col items-center justify-center w-full h-full overflow-hidden select-none ${containerClassName}`}>
      {/* Controles Flutuantes de Zoom */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/75 backdrop-blur-md p-1.5 rounded-full border border-white/20 shadow-xl">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 4}
          className="w-8 h-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Aumentar Zoom (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="w-8 h-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Diminuir Zoom (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={scale === 1 && position.x === 0 && position.y === 0}
          className="w-8 h-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Resetar Zoom"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] font-mono text-slate-200 font-bold px-1 min-w-[36px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleOpenNewTab}
          className="w-8 h-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Abrir imagem em nova guia"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Dica visual quando com zoom ativado */}
      {scale > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-medium flex items-center gap-1.5 border border-white/10 pointer-events-none animate-in fade-in">
          <Move className="w-3.5 h-3.5 text-blue-400" />
          <span>Arraste para mover • Duplo clique para resetar</span>
        </div>
      )}

      {/* Container da Imagem com Pan/Zoom */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        className={`w-full h-full flex items-center justify-center overflow-hidden p-2 ${scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out'
          }}
          className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-shadow ${className}`}
        />
      </div>
    </div>
  )
}
