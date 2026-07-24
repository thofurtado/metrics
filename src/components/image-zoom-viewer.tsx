'use client'
import { ExternalLink, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import React, { PointerEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

interface ImageZoomViewerProps {
  src: string
  alt?: string
  className?: string
  containerClassName?: string
}

export function ImageZoomViewer({
  src,
  alt = 'Comprovante',
  className = '',
  containerClassName = '',
}: ImageZoomViewerProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom ao trocar de imagem
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [src])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 5))
  }

  const handleZoomOut = () => {
    setScale((prev) => {
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

    // Suaviza o zoom pelo scroll
    const delta = e.deltaY < 0 ? 0.25 : -0.25
    setScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 1), 5)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    // Captura os eventos de ponteiro para que o arraste continue mesmo fora do container
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || scale <= 1) return
    e.preventDefault()
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
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
    <div
      className={`relative flex h-full w-full min-h-0 min-w-0 select-none flex-col items-center justify-center overflow-hidden ${containerClassName}`}
    >
      {/* Controles Flutuantes de Zoom */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 p-1.5 shadow-xl backdrop-blur-md">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 5}
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Aumentar Zoom (+)"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Diminuir Zoom (-)"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleReset}
          disabled={scale === 1 && position.x === 0 && position.y === 0}
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Resetar Zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-[36px] px-1 text-center font-mono text-[10px] font-bold text-slate-200">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleOpenNewTab}
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          title="Abrir imagem em nova guia"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Dica visual quando com zoom ativado */}
      {scale > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-md animate-in fade-in">
          <Move className="h-3.5 w-3.5 text-blue-400" />
          <span>Arraste para mover • Duplo clique para resetar</span>
        </div>
      )}

      {/* Container da Imagem com Pan/Zoom */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`flex h-full w-full min-h-0 min-w-0 touch-none items-center justify-center overflow-hidden p-2 ${scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'}`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="pointer-events-none flex h-full w-full min-h-0 min-w-0 items-center justify-center"
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={`pointer-events-auto max-h-full max-w-full rounded-xl object-contain shadow-2xl transition-shadow ${className}`}
          />
        </div>
      </div>
    </div>
  )
}
