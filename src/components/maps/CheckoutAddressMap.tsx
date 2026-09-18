'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Rocket } from 'lucide-react'
import { CARAGUATATUBA_NEIGHBORHOODS } from '@/data/geo/caraguatatuba-neighborhoods'

export interface SavedAddressItem {
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  complement?: string
  referencePoint?: string
  title?: string
}

interface CheckoutAddressMapProps {
  street: string
  number: string
  neighborhood: string
  city?: string
  savedAddresses?: SavedAddressItem[]
  onSelectSavedAddress?: (addr: SavedAddressItem) => void
}

// Coordenadas centrais padrão (Caraguatatuba Centro / Litoral Paulista)
const DEFAULT_CENTER = { lat: -23.6229, lng: -45.4125 }

export const CheckoutAddressMap: React.FC<CheckoutAddressMapProps> = ({
  street,
  number,
  neighborhood,
  city = 'Caraguatatuba',
  savedAddresses = [],
  onSelectSavedAddress,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersGroupRef = useRef<L.LayerGroup | null>(null)

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    if (neighborhood) {
      const match = CARAGUATATUBA_NEIGHBORHOODS.find(
        (n) => n.name.toLowerCase().trim() === neighborhood.toLowerCase().trim()
      )
      if (match) return { lat: match.lat, lng: match.lng }
    }
    return DEFAULT_CENTER
  })

  // 1. Resolução das Coordenadas reais no Brasil
  useEffect(() => {
    let isMounted = true

    async function resolve() {
      // 1.1 Tenta catálogo local de bairros (imediato e ultra-preciso)
      if (neighborhood) {
        const norm = neighborhood.toLowerCase().trim()
        const match = CARAGUATATUBA_NEIGHBORHOODS.find((n) => {
          const nNorm = n.name.toLowerCase().trim()
          return nNorm === norm || nNorm.includes(norm) || norm.includes(nNorm)
        })

        if (match && isMounted) {
          setCurrentCoords({ lat: match.lat, lng: match.lng })
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([match.lat, match.lng], 15, { animate: true })
          }
          return
        }
      }

      // 1.2 Geocodificação OpenStreetMap Nominatim
      if (street && street.length > 3) {
        try {
          const cleanStreet = street.replace(/^(Rua|Avenida|Av\\.?|R\\.?)\\s+/i, '').trim()
          const query = `${cleanStreet}, ${neighborhood || ''}, ${city || 'Caraguatatuba'}, SP, Brasil`
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          )
          const data = await res.json()
          if (isMounted && Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            const lat = parseFloat(data[0].lat)
            const lng = parseFloat(data[0].lon)
            setCurrentCoords({ lat, lng })
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([lat, lng], 16, { animate: true })
            }
            return
          }
        } catch {
          // Ignora fallback silenciosamente
        }
      }
    }

    resolve()
    return () => {
      isMounted = false
    }
  }, [street, neighborhood, city])

  // 2. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        ;(mapContainerRef.current as any)._leaflet_id = null
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      })

      // Tile Layer OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      markersGroupRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map

      setTimeout(() => {
        map.invalidateSize()
      }, 250)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 3. Renderização dos Marcadores Interativos
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return

    markersGroupRef.current.clearLayers()

    // 3.1 Marcadores de outros endereços cadastrados do cliente
    if (Array.isArray(savedAddresses)) {
      savedAddresses.forEach((saved, i) => {
        const isSelected =
          saved.street?.toLowerCase().trim() === street?.toLowerCase().trim() &&
          saved.number === number

        let sCoords = DEFAULT_CENTER
        if (saved.neighborhood) {
          const match = CARAGUATATUBA_NEIGHBORHOODS.find(
            (n) => n.name.toLowerCase().trim() === saved.neighborhood?.toLowerCase().trim()
          )
          if (match) sCoords = { lat: match.lat, lng: match.lng }
        }

        if (!isSelected) {
          const otherIcon = L.divIcon({
            className: 'custom-saved-pin',
            html: `
              <div style="cursor: pointer; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
                <div style="background: #1e293b; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 1.5px solid white;">
                  ${saved.title || `Endereço ${i + 1}`}
                </div>
                <div style="width: 10px; height: 10px; background: #1e293b; border: 2px solid white; border-radius: 50%; margin: 2px auto 0;"></div>
              </div>
            `,
            iconSize: [80, 40],
            iconAnchor: [40, 40],
          })

          const marker = L.marker([sCoords.lat, sCoords.lng], { icon: otherIcon })
          marker.on('click', () => {
            if (onSelectSavedAddress) onSelectSavedAddress(saved)
          })
          marker.addTo(markersGroupRef.current!)
        }
      })
    }

    // 3.2 Marcador Ativo Selecionado (Pino Verde Fiel ao Stitch)
    const activeIcon = L.divIcon({
      className: 'custom-active-pin',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <div style="background: #065f46; color: white; font-size: 11px; font-weight: 900; padding: 3px 10px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.9);">
            🏠 Casa (Selecionado)
          </div>
          <svg style="width: 30px; height: 30px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));" viewBox="0 0 24 24" fill="#059669" stroke="#ffffff" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
          </svg>
        </div>
      `,
      iconSize: [120, 60],
      iconAnchor: [60, 60],
    })

    L.marker([currentCoords.lat, currentCoords.lng], { icon: activeIcon }).addTo(
      markersGroupRef.current
    )
  }, [currentCoords, street, number, savedAddresses, onSelectSavedAddress])

  return (
    <div className="relative w-full h-40 sm:h-44 rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 group">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Tarja Flutuante Inferior (Entregar Aqui) */}
      <div className="absolute bottom-2.5 inset-x-3 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-1.5 text-xs font-black text-slate-800 shadow-md border border-slate-200/80 max-w-full truncate">
          <Rocket className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">
            Entregar aqui: {street ? `${street}, nº ${number || 'S/N'}` : 'Localizando seu endereço...'}
          </span>
        </div>
      </div>
    </div>
  )
}
