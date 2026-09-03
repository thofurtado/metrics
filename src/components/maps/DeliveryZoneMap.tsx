'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Check,
  Plus,
  RefreshCw,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CARAGUATATUBA_NEIGHBORHOODS,
  NeighborhoodGeo,
  haversineDistanceKm,
  findNeighborhoodsWithinRadius,
} from '@/data/geo/caraguatatuba-neighborhoods'

export interface DeliverySector {
  id: string
  name: string
  fee: number | string
  estimatedTimeMin?: number | string
  estimatedTimeMax?: number | string
  radiusKm?: number
  neighborhoods: string[]
}

interface DeliveryZoneMapProps {
  sectors: DeliverySector[]
  activeSectorId: string | null
  onSelectSector: (sectorId: string) => void
  onUpdateSectorNeighborhoods: (sectorId: string, neighborhoods: string[]) => void
  onUpdateSectorRadius: (sectorId: string, radiusKm: number) => void
  restaurantAddress?: {
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    state?: string
    zipcode?: string
  }
}

const SECTOR_COLORS = [
  { stroke: '#10b981', fill: '#10b981', name: 'Esmeralda', bg: 'bg-emerald-500' },
  { stroke: '#3b82f6', fill: '#3b82f6', name: 'Azul', bg: 'bg-blue-500' },
  { stroke: '#f59e0b', fill: '#f59e0b', name: 'Âmbar', bg: 'bg-amber-500' },
  { stroke: '#8b5cf6', fill: '#8b5cf6', name: 'Roxo', bg: 'bg-purple-500' },
  { stroke: '#ec4899', fill: '#ec4899', name: 'Rosa', bg: 'bg-pink-500' },
  { stroke: '#06b6d4', fill: '#06b6d4', name: 'Ciano', bg: 'bg-cyan-500' },
]

export function DeliveryZoneMap({
  sectors,
  activeSectorId,
  onSelectSector,
  onUpdateSectorNeighborhoods,
  onUpdateSectorRadius,
  restaurantAddress,
}: DeliveryZoneMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circlesGroupRef = useRef<L.LayerGroup | null>(null)
  const markersGroupRef = useRef<L.LayerGroup | null>(null)
  const restaurantMarkerRef = useRef<L.Marker | null>(null)

  // Coordenada base do Restaurante (Padrão Caraguatatuba / Balneário Copacabana ou Centro)
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number }>({
    lat: -23.5852,
    lng: -45.3481, // Copacabana / Massaguaçu (Giardinetto)
  })

  // Setor Ativo Selecionado
  const activeSector = useMemo(() => {
    return sectors.find((s) => s.id === activeSectorId) || sectors[0] || null
  }, [sectors, activeSectorId])

  // Geocodificação inicial baseada no endereço da loja se houver
  useEffect(() => {
    if (restaurantAddress?.neighborhood) {
      const match = CARAGUATATUBA_NEIGHBORHOODS.find(
        (n) => n.name.toLowerCase() === restaurantAddress.neighborhood?.toLowerCase(),
      )
      if (match) {
        setStoreCoords({ lat: match.lat, lng: match.lng })
      }
    }
  }, [restaurantAddress])

  // 1. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [storeCoords.lat, storeCoords.lng],
        zoom: 13,
        zoomControl: false,
      })

      // Adiciona controle de zoom no canto superior direito
      L.control.zoom({ position: 'topright' }).addTo(map)

      // Tile Layer: CartoDB Voyager (Design super limpo, elegante e leve)
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        },
      ).addTo(map)

      circlesGroupRef.current = L.layerGroup().addTo(map)
      markersGroupRef.current = L.layerGroup().addTo(map)

      mapInstanceRef.current = map
    }

    return () => {
      // Cleanup no unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 2. Atualiza Marcador do Restaurante
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (restaurantMarkerRef.current) {
      restaurantMarkerRef.current.setLatLng([storeCoords.lat, storeCoords.lng])
    } else {
      // Ícone Customizado com animação de pulso
      const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute -inset-2 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
            <div class="h-9 w-9 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-indigo-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })

      const marker = L.marker([storeCoords.lat, storeCoords.lng], {
        icon: storeIcon,
        draggable: true,
        title: 'Sua Loja / Ponto de Partida',
      }).addTo(map)

      marker.bindPopup(`
        <div class="text-xs p-1">
          <strong class="text-indigo-700 font-bold block text-sm">📍 Ponto Central da Loja</strong>
          <span class="text-slate-500">Arraste para ajustar o centro dos raios</span>
        </div>
      `)

      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng()
        setStoreCoords({ lat: newPos.lat, lng: newPos.lng })
      })

      restaurantMarkerRef.current = marker
    }
  }, [storeCoords])

  // 3. Atualiza Círculos dos Setores no Mapa
  useEffect(() => {
    const circlesGroup = circlesGroupRef.current
    if (!circlesGroup) return

    circlesGroup.clearLayers()

    sectors.forEach((sector, index) => {
      const radiusKm = sector.radiusKm || (index === 0 ? 3 : index === 1 ? 6 : (index + 1) * 3)
      const color = SECTOR_COLORS[index % SECTOR_COLORS.length]
      const isActive = sector.id === activeSector?.id

      const circle = L.circle([storeCoords.lat, storeCoords.lng], {
        radius: radiusKm * 1000,
        color: color.stroke,
        fillColor: color.fill,
        fillOpacity: isActive ? 0.18 : 0.08,
        weight: isActive ? 3 : 1.5,
        dashArray: isActive ? undefined : '5, 5',
      })

      circle.bindTooltip(`
        <div class="text-xs font-bold" style="color: ${color.stroke}">
          ${sector.name || `Setor ${index + 1}`} (${radiusKm} km)
        </div>
      `)

      circlesGroup.addLayer(circle)
    })
  }, [sectors, storeCoords, activeSector])

  // 4. Atualiza Marcadores de Bairros no Mapa
  useEffect(() => {
    const markersGroup = markersGroupRef.current
    if (!markersGroup) return

    markersGroup.clearLayers()

    CARAGUATATUBA_NEIGHBORHOODS.forEach((neighborhood) => {
      const distance = haversineDistanceKm(
        storeCoords.lat,
        storeCoords.lng,
        neighborhood.lat,
        neighborhood.lng,
      )

      // Descobre a qual setor o bairro pertence (se houver)
      const sectorIndex = sectors.findIndex((s) =>
        (s.neighborhoods || []).some(
          (n) => n.toLowerCase() === neighborhood.name.toLowerCase(),
        ),
      )

      const assignedSector = sectorIndex !== -1 ? sectors[sectorIndex] : null
      const sectorColor =
        sectorIndex !== -1
          ? SECTOR_COLORS[sectorIndex % SECTOR_COLORS.length].fill
          : '#94a3b8' // Cinza para não atribuído

      const marker = L.circleMarker([neighborhood.lat, neighborhood.lng], {
        radius: assignedSector ? 7 : 5,
        fillColor: sectorColor,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: assignedSector ? 0.95 : 0.6,
      })

      // Tooltip informativo
      marker.bindTooltip(`
        <div class="text-xs space-y-0.5">
          <div class="font-bold text-slate-900">${neighborhood.name}</div>
          <div class="text-[11px] text-slate-500">📏 <strong>${distance} km</strong> da loja (${neighborhood.region})</div>
          ${
            assignedSector
              ? `<div class="text-[11px] font-bold text-emerald-600">✓ Vinculado a: ${assignedSector.name || 'Setor'}</div>`
              : `<div class="text-[11px] text-amber-600">⚪ Sem setor atribuído</div>`
          }
        </div>
      `)

      // Clique no bairro: Vincula / Desvincula do setor ativo
      marker.on('click', () => {
        if (!activeSector) return

        const currentList = activeSector.neighborhoods || []
        const isAssignedToActive = currentList.some(
          (n) => n.toLowerCase() === neighborhood.name.toLowerCase(),
        )

        if (isAssignedToActive) {
          // Remove
          onUpdateSectorNeighborhoods(
            activeSector.id,
            currentList.filter((n) => n.toLowerCase() !== neighborhood.name.toLowerCase()),
          )
        } else {
          // Remove de qualquer outro setor para não duplicar
          sectors.forEach((sec) => {
            if (sec.id !== activeSector.id && (sec.neighborhoods || []).includes(neighborhood.name)) {
              onUpdateSectorNeighborhoods(
                sec.id,
                sec.neighborhoods.filter((n) => n.toLowerCase() !== neighborhood.name.toLowerCase()),
              )
            }
          })
          // Adiciona ao setor ativo
          onUpdateSectorNeighborhoods(activeSector.id, [...currentList, neighborhood.name])
        }
      })

      markersGroup.addLayer(marker)
    })
  }, [sectors, storeCoords, activeSector, onUpdateSectorNeighborhoods])

  // Ação: Auto-preencher bairros dentro do raio do setor ativo
  const handleAutoFillSector = () => {
    if (!activeSector) return

    const radiusKm = activeSector.radiusKm || 3
    const nearby = findNeighborhoodsWithinRadius(storeCoords.lat, storeCoords.lng, radiusKm)
    const nearbyNames = nearby.map((item) => item.neighborhood.name)

    // Remove esses bairros dos outros setores para evitar conflito
    sectors.forEach((sec) => {
      if (sec.id !== activeSector.id) {
        const remaining = (sec.neighborhoods || []).filter(
          (n) => !nearbyNames.includes(n),
        )
        if (remaining.length !== sec.neighborhoods.length) {
          onUpdateSectorNeighborhoods(sec.id, remaining)
        }
      }
    })

    // Atribui todos ao setor ativo
    onUpdateSectorNeighborhoods(activeSector.id, nearbyNames)
  }

  // Raio atual do setor selecionado
  const currentRadius = activeSector?.radiusKm || 3

  return (
    <div className="space-y-4">
      {/* Barra de Controle Superior do Mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Setores Concêntricos por Raio (KM)
            </h4>
            <p className="text-[11px] text-slate-500">
              Ajuste o círculo de cada setor para capturar bairros automaticamente.
            </p>
          </div>
        </div>

        {/* Abas Rápidas dos Setores */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {sectors.map((sector, index) => {
            const color = SECTOR_COLORS[index % SECTOR_COLORS.length]
            const isSelected = sector.id === activeSector?.id
            return (
              <button
                key={sector.id || index}
                type="button"
                onClick={() => onSelectSector(sector.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0',
                  isSelected
                    ? 'border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-transparent bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200',
                )}
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', color.bg)} />
                <span>{sector.name || `Setor ${index + 1}`}</span>
                <span className="text-[10px] text-slate-400">({sector.neighborhoods?.length || 0})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Painel do Setor Ativo: Slider de Raio e Ação Mágica */}
      {activeSector && (
        <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                Raio de Cobertura de <strong>{activeSector.name || 'Setor'}</strong>:
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {currentRadius} km
                </span>
              </span>
              <p className="text-[11px] text-slate-500">
                Arrastando o slider você expande o círculo de entrega no mapa.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleAutoFillSector}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-Selecionar Bairros deste Raio
            </Button>
          </div>

          <div className="pt-2 px-1">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={currentRadius}
                onChange={(e) => onUpdateSectorRadius(activeSector.id, parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-16 text-right">
                {currentRadius} km
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>1 km (Vizinhança)</span>
              <span>5 km</span>
              <span>10 km</span>
              <span>15 km</span>
              <span>25 km (Cidade toda)</span>
            </div>
          </div>
        </div>
      )}

      {/* Container Visual do Mapa Leaflet */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
        <div ref={mapContainerRef} className="h-[420px] w-full z-0" />

        {/* Legenda Flutuante no Canto Inferior Esquerdo */}
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] shadow-lg max-w-xs space-y-1.5">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-indigo-600" />
            <span>Legenda do Mapa:</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-300"></span>
              <span>Sua Loja (Centro)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              <span>Bairro sem setor</span>
            </div>
            {sectors.map((s, idx) => (
              <div key={s.id || idx} className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length].fill }}
                ></span>
                <span className="truncate">{s.name || `Setor ${idx + 1}`}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
            💡 <em>Clique em qualquer bolinha no mapa para vincular/desvincular o bairro.</em>
          </div>
        </div>
      </div>
    </div>
  )
}
