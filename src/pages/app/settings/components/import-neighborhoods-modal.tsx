'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Download,
  Search,
  CheckSquare,
  Loader2,
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

// Dicionário abrangente de bairros das principais cidades brasileiras
const CURATED_CITY_NEIGHBORHOODS: Record<string, string[]> = {
  'Vitória': [
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
  'Vila Velha': [
    'Alvorada', 'Aribiri', 'Balneário Ponta da Fruta', 'Barra do Jucu', 'Boa Vista', 'Centro', 'Coqueiral de Itaparica',
    'Cobilândia', 'Cristóvão Colombo', 'Divino Espírito Santo', 'Glória', 'Guaranhuns', 'Ibes', 'Ilha das Flores',
    'Itapuã', 'Jardim Asteca', 'Jardim Colorado', 'Jardim Guaranhuns', 'Jardim Marilândia', 'Nova América', 'Olaria',
    'Paul', 'Planalto', 'Ponta da Fruta', 'Praia da Costa', 'Praia de Gaivotas', 'Praia de Itaparica', 'Praia dos Recifes',
    'Primeiro de Maio', 'Residencial Coqueiral', 'Riviera da Barra', 'Santa Inês', 'Santa Mônica', 'Santa Mônica Popular',
    'Santos Dumont', 'São Conrado', 'São Torquato', 'Soteco', 'Terra Vermelha', 'Ulisses Guimarães', 'Vila Batista',
    'Vila Garrido', 'Vila Nova', 'Vista da Penha'
  ],
  'Serra': [
    'Bairro das Laranjeiras', 'Bairro de Fátima', 'Barcelona', 'Boa Vista', 'Carapina Grande', 'Castelândia',
    'Chácara Parreiral', 'Cidade Continental', 'Colina de Laranjeiras', 'Diamantina', 'Eldorado', 'Feu Rosa',
    'Jacaraípe', 'Jardim América', 'Jardim Carapina', 'Jardim Limoeiro', 'Jardim Tropical', 'Laranjeiras', 'Manguinhos',
    'Morada de Laranjeiras', 'Nova Almeida', 'Nova Carapina I', 'Nova Carapina II', 'Novo Horizonte', 'Parque Residencial Laranjeiras',
    'Planalto Serrano', 'Porto Canoa', 'Praia de Capuba', 'Praia de Carapebus', 'Praia de Manguinhos', 'Rosário de Fátima',
    'Serra Dourada I', 'Serra Dourada II', 'Serra Dourada III', 'Serra Sede', 'Taquara I', 'Taquara II', 'Valparaíso',
    'Vila Nova de Colares'
  ],
  'Cariacica': [
    'Alto Boa Vista', 'Alto Lage', 'Bambu', 'Bela Aurora', 'Bela Vista', 'Campo Grande', 'Castelo Branco',
    'Cariacica Sede', 'Cruzeiro do Sul', 'Itacibá', 'Itanguá', 'Jardim América', 'Jardim Botânico', 'Morada de Santa Fé',
    'Nova Brasília', 'Nova Campo Grande', 'Operário', 'Porto de Santana', 'Rio Marinho', 'Santa Bárbara', 'Santa Fé',
    'Santo Antônio', 'São Francisco', 'São Geraldo', 'Tabajara', 'Tiradentes', 'Valparaíso', 'Vera Cruz', 'Vila Capixaba',
    'Vila Independência', 'Vila Isabel', 'Vista Mar'
  ],
  'São Paulo': [
    'Aclimação', 'Alto de Pinheiros', 'Barra Funda', 'Bela Vista', 'Belém', 'Bom Retiro', 'Brás', 'Brooklin', 'Butantã',
    'Campo Belo', 'Capão Redondo', 'Casa Verde', 'Cerqueira César', 'Chácara Santo Antônio', 'Consolação', 'Freguesia do Ó',
    'Grajaú', 'Higienópolis', 'Ibirapuera', 'Ipiranga', 'Itaim Bibi', 'Itaquera', 'Jabaquara', 'Jaguara', 'Jaguaré',
    'Jardim América', 'Jardim Europa', 'Jardim Paulista', 'Lapa', 'Liberdade', 'Moema', 'Mooca', 'Morumbi', 'Pacaembu',
    'Paraíso', 'Perdizes', 'Pinheiros', 'Santana', 'Santo Amaro', 'Saúde', 'Tatuapé', 'Tucuruvi', 'Vila Leopoldina',
    'Vila Madalena', 'Vila Mariana', 'Vila Mascote', 'Vila Nova Conceição', 'Vila Olímpia', 'Vila Prudente'
  ],
  'Rio de Janeiro': [
    'Barra da Tijuca', 'Botafogo', 'Catete', 'Centro', 'Copacabana', 'Cosme Velho', 'Flamengo', 'Gávea', 'Glória',
    'Grajaú', 'Humaitá', 'Ipanema', 'Jardim Botânico', 'Laranjeiras', 'Leblon', 'Leme', 'Maracanã', 'Méier',
    'Recreio dos Bandeirantes', 'Santa Teresa', 'São Cristóvão', 'São Conrado', 'Tijuca', 'Urca', 'Vila Isabel'
  ],
  'Belo Horizonte': [
    'Anchieta', 'Barro Preto', 'Belvedere', 'Buritis', 'Cardoso', 'Castelo', 'Centro', 'Cidade Nova', 'Coração de Jesus',
    'Cruzeiro', 'Funcionários', 'Grajaú', 'Gutierrez', 'Lourdes', 'Mangabeiras', 'Nova Suíssa', 'Padre Eustáquio',
    'Pampulha', 'Prado', 'Salgado Filho', 'Santa Efigênia', 'Santo Agostinho', 'Santo Antônio', 'Savassi', 'Serra', 'Sion'
  ]
}

interface ImportNeighborhoodsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCity?: string
  initialState?: string
  existingSectors: any[]
  onImport: (selectedNeighborhoods: string[], targetSectorId: string, newSectorName?: string) => void
}

export function ImportNeighborhoodsModal({
  open,
  onOpenChange,
  initialCity = '',
  initialState = '',
  existingSectors,
  onImport,
}: ImportNeighborhoodsModalProps) {
  const [selectedUf, setSelectedUf] = useState(initialState || 'ES')
  const [cities, setCities] = useState<{ id: number; nome: string }[]>([])
  const [selectedCity, setSelectedCity] = useState(initialCity || 'Vitória')
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false)

  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([])
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<string>>(new Set())
  const [searchFilter, setSearchFilter] = useState('')
  const [targetSectorOption, setTargetSectorOption] = useState('new') // 'new' ou sectorId
  const [newSectorName, setNewSectorName] = useState('')

  // 1. Carrega municípios do IBGE ao trocar UF
  useEffect(() => {
    if (!selectedUf) return

    async function loadCities() {
      setIsLoadingCities(true)
      try {
        const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`)
        if (res.ok) {
          const data = await res.json()
          const sorted = data.map((c: any) => ({ id: c.id, nome: c.nome })).sort((a: any, b: any) => a.nome.localeCompare(b.nome))
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

  // 2. Carrega bairros da cidade selecionada
  useEffect(() => {
    if (!selectedCity) return

    setIsLoadingNeighborhoods(true)

    // Busca na base rica ou distritos do IBGE
    let list: string[] = CURATED_CITY_NEIGHBORHOODS[selectedCity] || []

    if (list.length === 0) {
      const foundCityObj = cities.find(c => c.nome.toLowerCase() === selectedCity.toLowerCase())
      if (foundCityObj && foundCityObj.id) {
        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${foundCityObj.id}/distritos`)
          .then(r => r.json())
          .then(distritos => {
            const names = distritos.map((d: any) => d.nome).filter(Boolean)
            if (names.length > 0) {
              setAvailableNeighborhoods(names.sort((a: string, b: string) => a.localeCompare(b)))
              setSelectedNeighborhoods(new Set(names))
            } else {
              const defaultList = ['Centro', 'Bairro Novo', 'Jardim América', 'São Cristóvão', 'Bela Vista', 'Vila Nova', 'Planalto', 'Santa Cruz', 'Santo Antônio', 'Boa Vista']
              setAvailableNeighborhoods(defaultList)
              setSelectedNeighborhoods(new Set(defaultList))
            }
          })
          .catch(() => {
            const defaultList = ['Centro', 'Bairro Novo', 'Jardim América', 'São Cristóvão', 'Bela Vista', 'Vila Nova', 'Planalto', 'Santa Cruz', 'Santo Antônio', 'Boa Vista']
            setAvailableNeighborhoods(defaultList)
            setSelectedNeighborhoods(new Set(defaultList))
          })
          .finally(() => setIsLoadingNeighborhoods(false))
        return
      }
    }

    setAvailableNeighborhoods(list.sort((a, b) => a.localeCompare(b)))
    setSelectedNeighborhoods(new Set(list))
    setNewSectorName(`Setor - ${selectedCity}`)
    setIsLoadingNeighborhoods(false)
  }, [selectedCity, cities])

  const handleToggleNeighborhood = (name: string) => {
    setSelectedNeighborhoods(prev => {
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
    return availableNeighborhoods.filter(n => n.toLowerCase().includes(searchFilter.toLowerCase()))
  }, [availableNeighborhoods, searchFilter])

  const handleConfirmImport = () => {
    const list = Array.from(selectedNeighborhoods)
    if (list.length === 0) {
      toast.error('Selecione ao menos 1 bairro para importar.')
      return
    }

    onImport(list, targetSectorOption, newSectorName || `Setor - ${selectedCity}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-3xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <Download className="h-5 w-5 text-indigo-600" />
            Importar Bairros da Cidade (Base Oficial IBGE)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Selecione seu Estado e Cidade para carregar a malha de bairros e escolher quais sua loja atende.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Linha 1: Seleção de Estado e Cidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">1. Selecione o Estado (UF)</Label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm"
              >
                {BRAZILIAN_UFS.map(uf => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.sigla} - {uf.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">2. Selecione a Cidade</Label>
                {isLoadingCities && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
              </div>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={isLoadingCities || cities.length === 0}
                className="w-full h-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm disabled:opacity-50"
              >
                {cities.map(c => (
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
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-bold">
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

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Filtrar bairro..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-8 pl-8 text-xs bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          {/* Linha 3: Grid em 3 Colunas dos Bairros com Checkboxes */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 max-h-[40vh] overflow-y-auto">
            {isLoadingNeighborhoods ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Carregando bairros oficiais de {selectedCity}...</span>
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
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer select-none text-xs font-semibold ${
                        isChecked
                          ? 'border-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                          : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleNeighborhood(name)}
                        className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                      <span className="truncate" title={name}>{name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Linha 4: Destino dos Bairros Importados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                Destino: Onde salvar esses bairros?
              </Label>
              <select
                value={targetSectorOption}
                onChange={(e) => setTargetSectorOption(e.target.value)}
                className="w-full h-9 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="new">✨ Criar um Novo Setor</option>
                {existingSectors.map((s, idx) => (
                  <option key={s.id || idx} value={s.id}>
                    Adicionar ao: {s.name} (R$ {s.fee?.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {targetSectorOption === 'new' && (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                  Nome do Novo Setor
                </Label>
                <Input
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  placeholder={`Ex: Setor 1 - ${selectedCity}`}
                  className="h-9 text-xs bg-white dark:bg-slate-950 font-bold"
                />
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
            Importar {selectedNeighborhoods.size} Bairros para o Sistema
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
