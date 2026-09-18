'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Rocket, Crosshair, ZoomIn, ZoomOut, Navigation, Loader2 } from 'lucide-react'
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
  zipcode?: string
  savedAddresses?: SavedAddressItem[]
  gpsTriggerNonce?: number
  onSelectSavedAddress?: (addr: SavedAddressItem) => void
  onCoordinatesChange?: (coords: { lat: number; lng: number }) => void
  onAddressResolved?: (resolved: {
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    zipcode?: string
  }) => void
}

// Coordenadas centrais padrão (Caraguatatuba Centro / Litoral Paulista)
const DEFAULT_CENTER = { lat: -23.6229, lng: -45.4125 }

export const CheckoutAddressMap: React.FC<CheckoutAddressMapProps> = ({
  street,
  number,
  neighborhood,
  city = 'Caraguatatuba',
  zipcode,
  savedAddresses = [],
  gpsTriggerNonce,
  onSelectSavedAddress,
  onCoordinatesChange,
  onAddressResolved,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersGroupRef = useRef<L.LayerGroup | null>(null)
  const activeMarkerRef = useRef<L.Marker | null>(null)
  const lastGeocodedKeyRef = useRef<string>('')
  const isUserGpsFixedRef = useRef<boolean>(false)
  const [isLocatingGps, setIsLocatingGps] = useState(false)
  const [isGpsActive, setIsGpsActive] = useState(false)

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>(() => {
    if (neighborhood) {
      const match = CARAGUATATUBA_NEIGHBORHOODS.find(
        (n) => n.name.toLowerCase().trim() === neighborhood.toLowerCase().trim()
      )
      if (match) return { lat: match.lat, lng: match.lng }
    }
    return DEFAULT_CENTER
  })

  // 1. Resolução e Geocodificação das Coordenadas da Rua com Alta Precisão (ArcGIS -> Nominatim -> Bairro)
  useEffect(() => {
    let isMounted = true

    async function resolveCoordinates() {
      if (isUserGpsFixedRef.current) return
      if (!street || street.trim().length < 3) return
      const currentKey = `${street.trim()}|${(number || '').trim()}|${(neighborhood || '').trim()}|${(zipcode || '').trim()}|${(city || '').trim()}`
      if (currentKey === lastGeocodedKeyRef.current) return
      lastGeocodedKeyRef.current = currentKey

      // 1.1 Tenta PRIMEIRO o ArcGIS World Geocoding (Líder em precisão no Brasil, resolve números e ruas de loteamento)
      try {
        const queryParts = [
          street ? `${street}${number ? `, ${number}` : ''}` : '',
          neighborhood || '',
          zipcode ? zipcode.replace(/\D/g, '') : '',
          city || 'Caraguatatuba',
          'SP, Brasil',
        ].filter(Boolean)
        const query = queryParts.join(', ')

        const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=${encodeURIComponent(
          query
        )}&maxLocations=1`
        const res = await fetch(arcgisUrl)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.candidates) && data.candidates.length > 0) {
            const candidate = data.candidates[0]
            if (candidate.score >= 70 && candidate.location?.x && candidate.location?.y) {
              const lat = candidate.location.y
              const lng = candidate.location.x
              setCurrentCoords({ lat, lng })
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([lat, lng], 17, { animate: true })
              }
              if (onCoordinatesChange) {
                try {
                  onCoordinatesChange({ lat, lng })
                } catch (e) {
                  console.warn('onCoordinatesChange error:', e)
                }
              }
              return
            }
          }
        }
      } catch (err) {
        console.warn('ArcGIS geocoding fallback:', err)
      }

      // 1.2 Fallback: OpenStreetMap Nominatim com consulta estruturada e completa
      try {
        const query = `${street}${number ? ` ${number}` : ''}, ${neighborhood ? `${neighborhood}, ` : ''}${city || 'Caraguatatuba'}, SP, Brasil`
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
            mapInstanceRef.current.setView([lat, lng], 17, { animate: true })
          }
          if (onCoordinatesChange) {
            try {
              onCoordinatesChange({ lat, lng })
            } catch (e) {
              console.warn('onCoordinatesChange error:', e)
            }
          }
          return
        }
      } catch {
        // Continua para o fallback de bairro
      }

      // 1.3 Fallback: Catálogo local geocodificado de Caraguatatuba
      if (neighborhood) {
        const norm = neighborhood.toLowerCase().trim()
        const match = CARAGUATATUBA_NEIGHBORHOODS.find((n) => {
          const nNorm = n.name.toLowerCase().trim()
          return nNorm === norm || nNorm.includes(norm) || norm.includes(nNorm)
        })

        if (match && isMounted) {
          setCurrentCoords({ lat: match.lat, lng: match.lng })
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([match.lat, match.lng], 16, { animate: true })
          }
          if (onCoordinatesChange) {
            try {
              onCoordinatesChange({ lat: match.lat, lng: match.lng })
            } catch (e) {
              console.warn('onCoordinatesChange error:', e)
            }
          }
          return
        }
      }
    }

    resolveCoordinates()
    return () => {
      isMounted = false
    }
  }, [street, number, neighborhood, city, zipcode])

  // 2. Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapInstanceRef.current) {
      if ((mapContainerRef.current as any)._leaflet_id) {
        ;(mapContainerRef.current as any)._leaflet_id = null
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      })

      // Tile Layer OpenStreetMap em alta definição
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      markersGroupRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map

      // Clique no mapa move o pino diretamente para o ponto clicado
      map.on('click', (e: L.LeafletMouseEvent) => {
        isUserGpsFixedRef.current = true
        setIsGpsActive(true)
        const newCoords = { lat: e.latlng.lat, lng: e.latlng.lng }
        setCurrentCoords(newCoords)
        if (activeMarkerRef.current) {
          activeMarkerRef.current.setLatLng(e.latlng)
        }
        if (onCoordinatesChange) {
          try {
            onCoordinatesChange(newCoords)
          } catch (e) {
            console.warn('onCoordinatesChange error:', e)
          }
        }
      })

      setTimeout(() => { map.invalidateSize() }, 100)
      setTimeout(() => { map.invalidateSize() }, 300)
      setTimeout(() => { map.invalidateSize() }, 600)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // 3. Renderização dos Marcadores Interativos (Pino Fixo sem Drift ao Zoom)
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return

    markersGroupRef.current.clearLayers()

    // 3.1 Marcadores de outros endereços salvos
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
            className: 'custom-saved-pin-container',
            html: `
              <div style="width: 100px; height: 42px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin: 0; padding: 0; pointer-events: auto; cursor: pointer;">
                <div style="background: #1e293b; color: #ffffff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 1.5px solid #ffffff;">
                  ${saved.title || `Endereço ${i + 1}`}
                </div>
                <div style="width: 10px; height: 10px; background: #1e293b; border: 2px solid #ffffff; border-radius: 50%; margin: 2px 0 0 0;"></div>
              </div>
            `,
            iconSize: [100, 42],
            iconAnchor: [50, 42],
          })

          const marker = L.marker([sCoords.lat, sCoords.lng], { icon: otherIcon })
          marker.on('click', () => {
            if (onSelectSavedAddress) onSelectSavedAddress(saved)
          })
          marker.addTo(markersGroupRef.current!)
        }
      })
    }

    // 3.2 Marcador Ativo Selecionado (Alvo Verde com Pílula "Portão de entrega selecionado" - Fiel ao Stitch)
    const activeIcon = L.divIcon({
      className: 'custom-active-pin-container',
      html: `
        <div style="width: 220px; height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin: 0; padding: 0; pointer-events: auto; cursor: grab; user-select: none;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #10b981; border: 3.5px solid #ffffff; box-shadow: 0 4px 16px rgba(16,185,129,0.5); display: flex; align-items: center; justify-content: center;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="22" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="12" x2="2" y2="12"></line>
              <line x1="12" y1="6" x2="12" y2="2"></line>
              <line x1="12" y1="22" x2="12" y2="18"></line>
            </svg>
          </div>
          <div style="background: #ffffff; color: #0f172a; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.12); border: 1.5px solid #e2e8f0; margin-top: 5px; display: flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
            Portão de entrega selecionado
          </div>
        </div>
      `,
      iconSize: [220, 76],
      iconAnchor: [110, 22],
    })

    const activeMarker = L.marker([currentCoords.lat, currentCoords.lng], {
      icon: activeIcon,
      draggable: true,
      zIndexOffset: 1000,
    })

    // Permite que o cliente arraste o pino para a sua casa exata na rua
    activeMarker.on('dragend', (e: any) => {
      isUserGpsFixedRef.current = true
      setIsGpsActive(true)
      const pos = e.target.getLatLng()
      const newCoords = { lat: pos.lat, lng: pos.lng }
      setCurrentCoords(newCoords)
      if (onCoordinatesChange) onCoordinatesChange(newCoords)
    })

    activeMarker.addTo(markersGroupRef.current!)
    activeMarkerRef.current = activeMarker
  }, [currentCoords, street, number, savedAddresses, onSelectSavedAddress, onCoordinatesChange])

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut()
  }

    useEffect(() => {
    if (gpsTriggerNonce && gpsTriggerNonce > 0) {
      handleGetGpsLocation(false)
    }
  }, [gpsTriggerNonce])

  const handleGetGpsLocation = (isUserClick = true) => {
    if (!navigator.geolocation) {
      if (isUserClick) alert('Seu navegador ou celular não possui suporte à localização GPS.')
      return
    }

    setIsLocatingGps(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGps(false)
        setIsGpsActive(true)
        isUserGpsFixedRef.current = true

        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const gpsCoords = { lat, lng }

        setCurrentCoords(gpsCoords)

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 18, { animate: true })
        }

        if (onCoordinatesChange) {
          try {
            onCoordinatesChange(gpsCoords)
          } catch (e) {
            console.warn('onCoordinatesChange error:', e)
          }
        }

        // Geocodificação reversa cadastral via ArcGIS para preencher rua e bairro
        try {
          const revUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&f=json`
          const res = await fetch(revUrl)
          if (res.ok) {
            const data = await res.json()
            if (data.address && onAddressResolved) {
              const addr = data.address
              const resolvedStreet = addr.Address ? addr.Address.replace(/\s+\d+$/, '') : (addr.Match_addr?.split(',')[0] || '')
              onAddressResolved({
                street: resolvedStreet,
                number: addr.AddNum || '',
                neighborhood: addr.Neighborhood || addr.District || '',
                city: addr.City || 'Caraguatatuba',
                zipcode: addr.Postal || '',
              })
            }
          }
        } catch (revErr) {
          console.warn('Reverse geocode fallback:', revErr)
        }
      },
      (err) => {
        setIsLocatingGps(false)
        console.warn('GPS error:', err)
        if (isUserClick) {
          if (err.code === 1) {
            alert('Permissão de localização negada. Ative o GPS nas configurações do celular para usar essa função.')
          } else {
            alert('Sinal de GPS indisponível no momento. Toque no mapa ou arraste o pino para indicar seu endereço.')
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleRecenter = () => {
    handleGetGpsLocation()
  }

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100 group">
      {/* Container do Mapa Leaflet */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* CONTROLES FLUTUANTES NO TOPO DIREITO (FIEL À IMAGEM 3 DO STITCH) */}
      <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Botão Meu GPS com ícone verde e texto limpo */}
        <button
          type="button"
          onClick={() => handleGetGpsLocation(true)}
          disabled={isLocatingGps}
          className="flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2 text-xs font-black text-slate-800 shadow-md border border-slate-200/90 hover:bg-white active:scale-95 transition-all disabled:opacity-70"
          title="Localizar meu ponto exato via GPS"
        >
          {isLocatingGps ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <Crosshair className="h-4 w-4 text-emerald-600 stroke-[2.5]" />
          )}
          <span>Meu GPS</span>
        </button>

        {/* Card Vertical de Zoom (+ / -) */}
        <div className="flex flex-col items-center rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-slate-200/90 overflow-hidden w-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex h-9 w-full items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all border-b border-slate-100 font-extrabold text-base"
            title="Aproximar mapa"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex h-9 w-full items-center justify-center text-slate-800 hover:bg-slate-50 active:scale-90 transition-all font-extrabold text-base"
            title="Afastar mapa"
          >
            −
          </button>
        </div>
      </div>
    </div>
  )
}
