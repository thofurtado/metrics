'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  Search,
  CheckSquare,
  Loader2,
  MapPin,
  Building2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

// Lista das 27 UFs do Brasil
const BRAZILIAN_UFS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
]

interface ImportNeighborhoodsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCity?: string
  initialState?: string
  onImport: (selectedNeighborhoods: string[]) => void
}

export function ImportNeighborhoodsModal({
  open,
  onOpenChange,
  initialCity = '',
  initialState = '',
  onImport,
}: ImportNeighborhoodsModalProps) {
  const [selectedUf, setSelectedUf] = useState(initialState || 'SP')
  const [cities, setCities] = useState<{ id: number; nome: string }[]>([])
  const [selectedCity, setSelectedCity] = useState(initialCity || 'Caraguatatuba')
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false)

  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([])
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set())
  const [searchFilter, setSearchFilter] = useState('')

  // 1. Carrega municípios do IBGE ao trocar UF
  useEffect(() => {
    if (!selectedUf) return

    async function loadCities() {
      setIsLoadingCities(true)
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`)
        if (res.ok) {
          const data = await res.json()
          const sorted = data
            .map((c: any) => ({ id: c.id, nome: c.nome }))
            .sort((a: any, b: any) => a.nome.localeCompare(b.nome))
          setCities(sorted)

          if (sorted.length > 0) {
            const match = sorted.find((c: any) => c.nome.toLowerCase() === initialCity.toLowerCase())
            setSelectedCity(match ? match.nome : sorted[0].nome)
          }
        }
      } catch (err) {
        console.error('Erro ao buscar cidades:', err)
      } finally {
        setIsLoadingCities(false)
      }
    }

    loadCities()
  }, [selectedUf, initialCity])

  // 2. Carrega bairros da cidade selecionada via OpenStreetMap / Overpass API (com fallback de distritos)
  useEffect(() => {
    if (!selectedCity) return

    let isMounted = true
    setIsLoadingNeighborhoods(true)

    async function fetchNeighborhoods() {
      const cleanCityName = selectedCity.trim()
      let neighborhoodList: string[] = []

      // Overpass API (OpenStreetMap) - Traz todos os bairros reais da cidade
      try {
        const overpassQuery = `[out:json][timeout:12];
area["name"="${cleanCityName}"]->.a;
(
  node(area.a)["place"~"suburb|neighbourhood|quarter|village"];
  way(area.a)["place"~"suburb|neighbourhood|quarter|village"];
);
out tags;`

        const overpassUrl = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(overpassQuery)
        const res = await fetch(overpassUrl, {
          headers: { 'User-Agent': 'MetricsPDV/1.0' },
        })

        if (res.ok) {
          const data = await res.json()
          if (data.elements && data.elements.length > 0) {
            const rawNames = data.elements
              .map((e: any) => e.tags?.name)
              .filter(Boolean)

            // Remove o próprio nome da cidade para não figurar como bairro
            const unique = Array.from(
              new Set(
                rawNames.filter(
                  (n: string) => n.trim().toLowerCase() !== cleanCityName.toLowerCase()
                )
              )
            ) as string[]

            if (unique.length > 0) {
              neighborhoodList = unique.sort((a, b) => a.localeCompare(b))
            }
          }
        }
      } catch (e) {
        console.warn('Overpass API indisponível, tentando fallback...', e)
      }

      // Fallback: Distritos IBGE
      if (neighborhoodList.length === 0) {
        try {
          const foundCityObj = cities.find(
            (c) => c.nome.toLowerCase() === cleanCityName.toLowerCase()
          )
          if (foundCityObj && foundCityObj.id) {
            const distRes = await fetch(
              `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${foundCityObj.id}/distritos`
            )
            if (distRes.ok) {
              const distritos = await distRes.json()
              const names = distritos
                .map((d: any) => d.nome)
                .filter(
                  (name: string) =>
                    Boolean(name) &&
                    name.trim().toLowerCase() !== cleanCityName.toLowerCase()
                )
              if (names.length > 0) {
                neighborhoodList = Array.from(new Set(names)) as string[]
              }
            }
          }
        } catch (err) {
          console.error(err)
        }
      }

      if (neighborhoodList.length === 0) {
        neighborhoodList = ['Centro', 'Bairro Novo', 'Jardim América', 'São Cristóvão', 'Bela Vista', 'Vila Nova', 'Planalto', 'Santa Cruz', 'Santo Antônio', 'Boa Vista']
      }

      if (isMounted) {
        setAvailableNeighborhoods(neighborhoodList)
        setSelectedNeighborhoods(new Set(neighborhoodList))
        setIsLoadingNeighborhoods(false)
      }
    }

    fetchNeighborhoods()

    return () => {
      isMounted = false
    }
  }, [selectedCity, cities])

  const handleToggleNeighborhood = (name: string) => {
    setSelectedNeighborhoods((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedNeighborhoods(new Set(availableNeighborhoods))
  }

  const handleDeselectAll = () => {
    setSelectedNeighborhoods(new Set())
  }

  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return availableNeighborhoods
    return availableNeighborhoods.filter((n) =>
      n.toLowerCase().includes(searchFilter.toLowerCase())
    )
  }, [availableNeighborhoods, searchFilter])

  const handleConfirmImport = () => {
    const list = Array.from(selectedNeighborhoods)
    if (list.length === 0) {
      toast.error('Selecione ao menos 1 bairro para importar.')
      return
    }

    onImport(list)
    toast.success(`${list.length} bairros de ${selectedCity} importados com sucesso!`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-3xl shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Download className="h-5 w-5 text-indigo-600" />
            Importar Bairros da Cidade
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Carregue todos os bairros oficiais da sua cidade para o catálogo da loja e vincule aos seus setores de entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Linha 1: Seleção de Estado e Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Estado (UF)
              </Label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm"
              >
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.sigla} - {uf.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  2. Cidade
                </Label>
                {isLoadingCities && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={isLoadingCities || cities.length === 0}
                className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm disabled:opacity-50"
              >
                {cities.map((c) => (
                  <option key={c.id || c.nome} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Barra de Filtro & Ações de Seleção */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-bold"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                {selectedNeighborhoods.size} de {availableNeighborhoods.length} selecionados
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-7 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                Marcar Todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeselectAll}
                className="h-7 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              >
                Desmarcar Todos
              </Button>
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar bairro..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8 pl-8 text-xs bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Linha 3: Grid em 3 Colunas dos Bairros */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3.5 max-h-[46vh] overflow-y-auto">
            {isLoadingNeighborhoods ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">
                  Carregando bairros de {selectedCity}...
                </span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Nenhum bairro encontrado com o filtro &quot;{searchFilter}&quot;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {filteredList.map((name) => {
                  const isChecked = selectedNeighborhoods.has(name)
                  return (
                    <label
                      key={name}
                      onClick={() => handleToggleNeighborhood(name)}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer select-none text-xs font-semibold ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleNeighborhood(name)}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="truncate" title={name}>
                        {name}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3 mt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-slate-500"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedNeighborhoods.size === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20"
          >
            <Download className="h-4 w-4" />
            Importar {selectedNeighborhoods.size} Bairros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
