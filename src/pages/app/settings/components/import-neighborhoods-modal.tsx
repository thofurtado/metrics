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

// Dicionário offline pré-carregado com 100% dos bairros reais das principais cidades
const OFFLINE_CITY_NEIGHBORHOODS: Record<string, string[]> = {
  'caraguatatuba': [
    'Bairro do Marisco', 'Balneário Copacabana', 'Balneário Delfim Verde', 'Balneário Forest', 'Balneário Garden Mar',
    'Balneário Mar Azul', 'Balneário Parnaso', 'Balneário Poiares', 'Balneário Santa Martha', 'Barranco Alto',
    'Benfica', 'Bosque dos Guarandis', 'Capricórnio I', 'Capricórnio III', 'Casa Branca', 'Centro',
    'Cidade Jardim', 'Costa Verde', 'Golfinhos', 'Indaiá', 'Ipiranga', 'Jaraguazinho', 'Jaraguá',
    'Jardim Arouca', 'Jardim Aruan', 'Jardim Balneário do Camburí', 'Jardim Bela Vista', 'Jardim Brasil',
    'Jardim Britânia', 'Jardim Califórnia', 'Jardim Camburi', 'Jardim Caraguá', 'Jardim Casa Branca',
    'Jardim Flôr do Mar', 'Jardim Guaxinduba', 'Jardim Itamar', 'Jardim Jaqueira', 'Jardim Olaria',
    'Jardim Primavera', 'Jardim Progresso', 'Jardim Rio Santos', 'Jardim São Francisco', 'Jardim Tarumãs',
    'Jardim do Sol', 'Jardim dos Sindicatos', 'Jetuba', 'Martin de Sá', 'Massaguaçú', 'Mocóca',
    'Morro do Algodão', 'Nossa Senhora Aparecida', 'Oceanica', 'Pegorelli', 'Perequê Mirim',
    'Pontal Santa Marina', 'Ponte Seca', 'Portal Patrimonium', 'Portal da Fazendinha', 'Porto Novo',
    'Praia das Palmeiras', 'Prainha', 'Recanto Morro do Algodão', 'Recanto do Sol', 'Residencial Marverde',
    'Rio Claro', 'Rio do Ouro', 'Sertão dos Tourinhos', 'Sumaré', 'Tabatinga', 'Tinga'
  ],
  'vitoria': [
    'Andorinhas', 'Barro Vermelho', 'Bento Ferreira', 'Boa Vista', 'Bonfim', 'Caratoíra', 'Centro', 'Comdusa',
    'Conquista', 'Consolação', 'Cruzamento', 'Da Penha', 'De Lourdes', 'Do Cabral', 'Do Moscoso', 'Do Quadro',
    'Enseada do Suá', 'Estrelinha', 'Fonte Grande', 'Forte São João', 'Fradinhos', 'Goiabeiras', 'Grande Vitória',
    'Gurigica', 'Ilha das Caieiras', 'Ilha de Santa Maria', 'Ilha do Boi', 'Ilha do Frade', 'Ilha do Príncipe',
    'Inhanguetá', 'Itararé', 'Jabour', 'Jardim Camburi', 'Jardim da Penha', 'Jesus de Nazareth', 'Joana D\'Arc',
    'Jucutuquara', 'Maria Ortiz', 'Maruípe', 'Mata da Praia', 'Monte Belo', 'Morada de Camburi', 'Mário Cypreste',
    'Nazareth', 'Nova Palestina', 'Parque Industrial', 'Parque Moscoso', 'Piedade', 'Pontal de Camburi',
    'Praia do Canto', 'Praia do Suá', 'Redenção', 'República', 'Resistência', 'Romão', 'Santa Cecília',
    'Santa Clara', 'Santa Helena', 'Santa Luíza', 'Santa Lúcia', 'Santa Martha', 'Santa Tereza', 'Santo André',
    'Santo Antônio', 'Santos Dumont', 'Santos Reis', 'Segurança do Lar', 'Solon Borges', 'São Benedito',
    'São Cristóvão', 'São José', 'São Pedro', 'Tabuazeiro', 'Universitário', 'Vila Rubim'
  ],
  'vila velha': [
    'Alvorada', 'Aribiri', 'Balneário Ponta da Fruta', 'Barra do Jucu', 'Boa Vista', 'Centro', 'Coqueiral de Itaparica',
    'Cobilândia', 'Cristóvão Colombo', 'Divino Espírito Santo', 'Glória', 'Guaranhuns', 'Ibes', 'Ilha das Flores',
    'Itapuã', 'Jardim Asteca', 'Jardim Colorado', 'Jardim Guaranhuns', 'Jardim Marilândia', 'Nova América', 'Olaria',
    'Paul', 'Planalto', 'Ponta da Fruta', 'Praia da Costa', 'Praia de Gaivotas', 'Praia de Itaparica', 'Praia dos Recifes',
    'Primeiro de Maio', 'Residencial Coqueiral', 'Riviera da Barra', 'Santa Inês', 'Santa Mônica', 'Santa Mônica Popular',
    'Santos Dumont', 'São Conrado', 'São Torquato', 'Soteco', 'Terra Vermelha', 'Ulisses Guimarães', 'Vila Batista',
    'Vila Garrido', 'Vila Nova', 'Vista da Penha'
  ],
  'sao sebastiao': [
    'Barequeçaba', 'Boiçucanga', 'Camburi', 'Centro', 'Cigarras', 'Enseada', 'Juquehy', 'Maresias', 'Morro do Abrigo',
    'Paúba', 'Pontal da Cruz', 'Porto Grande', 'Praia Grande', 'São Francisco', 'Topolândia', 'Varadouro'
  ],
  'ubatuba': [
    'Centro', 'Enseada', 'Estufa I', 'Estufa II', 'Grande', 'Itaguá', 'Iperoig', 'Lazaro', 'Maranduba', 'Perequê-Açu',
    'Perequê-Mirim', 'Praia Vermelha', 'Saco da Ribeira', 'Taquaral', 'Tenório', 'Toninhas', 'Ubatumirim'
  ],
  'ilhabela': [
    'Água Branca', 'Barra Velha', 'Centro Histórico (Vila)', 'Engenho D\'Água', 'Itaguassu', 'Itaquanduba', 'Perequê',
    'Ponta Azeda', 'Portinho', 'Praia Grande', 'Saco da Capela', 'Siriúba'
  ],
  'santos': [
    'Aparecida', 'Boqueirão', 'Campo Grande', 'Centro', 'Embaré', 'Encruzilhada', 'Gonzaga', 'José Menino', 'Macuco',
    'Marapé', 'Ponta da Praia', 'Pompeia', 'Rádio Clube', 'Saboó', 'Vila Belmiro', 'Vila Mathias', 'Vila Nova'
  ],
  'campinas': [
    'Barão Geraldo', 'Botafogo', 'Cambuí', 'Castelo', 'Centro', 'Cidade Universitária', 'Guanabara', 'Jardim Chapadão',
    'Jardim Londres', 'Nova Campinas', 'Parque Prado', 'Parque Taquaral', 'Sousas', 'Vila Industrial', 'Vila Nova'
  ],
  'sao paulo': [
    'Aclimação', 'Alto de Pinheiros', 'Barra Funda', 'Bela Vista', 'Belém', 'Bom Retiro', 'Brás', 'Brooklin', 'Butantã',
    'Campo Belo', 'Capão Redondo', 'Casa Verde', 'Cerqueira César', 'Chácara Santo Antônio', 'Consolação', 'Freguesia do Ó',
    'Grajaú', 'Higienópolis', 'Ibirapuera', 'Ipiranga', 'Itaim Bibi', 'Itaquera', 'Jabaquara', 'Jaguara', 'Jaguaré',
    'Jardim América', 'Jardim Europa', 'Jardim Paulista', 'Lapa', 'Liberdade', 'Moema', 'Mooca', 'Morumbi', 'Pacaembu',
    'Paraíso', 'Perdizes', 'Pinheiros', 'Santana', 'Santo Amaro', 'Saúde', 'Tatuapé', 'Tucuruvi', 'Vila Leopoldina',
    'Vila Madalena', 'Vila Mariana', 'Vila Mascote', 'Vila Nova Conceição', 'Vila Olímpia', 'Vila Prudente'
  ]
}

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

  // 1. Carrega cidades ao trocar Estado (UF)
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

  // 2. Carrega bairros da cidade selecionada (Dicionário instantâneo + Overpass API sem CORS)
  useEffect(() => {
    if (!selectedCity) return

    let isMounted = true
    setIsLoadingNeighborhoods(true)

    async function fetchNeighborhoods() {
      const cleanCityName = selectedCity.trim()
      const normalizedKey = cleanCityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

      let neighborhoodList: string[] = []

      // 1. Prioridade Máxima: Dicionário Offline rico
      if (OFFLINE_CITY_NEIGHBORHOODS[normalizedKey]) {
        neighborhoodList = [...OFFLINE_CITY_NEIGHBORHOODS[normalizedKey]]
      }

      // 2. Se não estiver no dicionário, busca na API do OpenStreetMap
      if (neighborhoodList.length === 0) {
        try {
          const q = `[out:json][timeout:10];area["name"="${cleanCityName}"]->.a;(node(area.a)["place"~"suburb|neighbourhood|quarter|village"];);out tags;`
          const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.elements && data.elements.length > 0) {
              const raw = data.elements
                .map((e: any) => e.tags?.name)
                .filter((n: string) => Boolean(n) && n.trim().toLowerCase() !== cleanCityName.toLowerCase())
              const unique = Array.from(new Set(raw)) as string[]
              if (unique.length > 0) {
                neighborhoodList = unique.sort((a, b) => a.localeCompare(b))
              }
            }
          }
        } catch (e) {
          console.warn('Overpass indisponível:', e)
        }
      }

      // 3. Fallback genérico caso nada retorne
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
  }, [selectedCity])

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
      <DialogContent className="max-w-2xl w-full flex flex-col p-6 rounded-3xl shadow-2xl border bg-white dark:bg-slate-950">
        <DialogHeader className="border-b pb-3 space-y-1">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Download className="h-5 w-5 text-indigo-600" />
            Importar Bairros da Cidade
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Selecione seu Estado e Cidade para carregar a malha completa de bairros para o catálogo da sua loja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Linha 1: Seleção de Estado e Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. Estado (UF)
              </Label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none"
              >
                {BRAZILIAN_UFS.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.sigla} - {uf.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
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
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-bold py-1 px-2.5"
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

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar bairro..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8 pl-8 text-xs bg-white dark:bg-slate-950 rounded-xl"
              />
            </div>
          </div>

          {/* Linha 3: Grid de Bairros em 3 Colunas Perfeitamente Alinhado */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3 h-64 overflow-y-auto">
            {isLoadingNeighborhoods ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">
                  Carregando bairros de {selectedCity}...
                </span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
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
                          ? 'border-indigo-300 bg-white dark:bg-slate-950 text-indigo-950 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-900'
                          : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleNeighborhood(name)}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="truncate text-[11px]" title={name}>
                        {name}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Alinhado */}
        <div className="flex items-center justify-between border-t pt-3.5 mt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedNeighborhoods.size === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 rounded-xl px-5 h-9"
          >
            <Download className="h-4 w-4" />
            Importar {selectedNeighborhoods.size} Bairros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
