import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Banknote,
  Building2,
  CreditCard,
  Wallet,
  Clock,
  Copy,
  Download,
  Globe,
  Layers,
  Loader2,
  MapPin,
  Palette,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { Controller, useForm as useReactHookForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/axios'
import { ImportNeighborhoodsModal } from './components/import-neighborhoods-modal'
import { getPayments } from '@/api/get-payments'
import { updatePayment } from '@/api/update-payment'

const businessHourSchema = z.object({
  dayOfWeek: z.number(),
  openTime: z.string(),
  closeTime: z.string(),
  isOpen: z.boolean(),
})

const deliverySectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  fee: z.coerce.number().min(0),
  estimatedTimeMin: z.coerce.number().default(30),
  estimatedTimeMax: z.coerce.number().default(60),
  neighborhoods: z.array(z.string()),
})

const profileSchema = z.object({
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório'),
  companyName: z.string().optional(),
  document: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  isOpenManual: z.boolean(),
  whatsappNumber: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  deliveryFee: z.coerce.number().min(0, 'Taxa inválida').default(0),
  minOrderValue: z.coerce.number().min(0, 'Valor mínimo inválido').default(0),
  deliveryTimeMin: z.coerce.number().min(1, 'Tempo inválido').default(30),
  deliveryTimeMax: z.coerce.number().min(1, 'Tempo inválido').default(60),
  ifoodMerchantId: z.string().optional(),
  anotaAiApiKey: z.string().optional(),
  pixKey: z.string().optional(),
  availableNeighborhoods: z.array(z.string()).optional().default([]),
  deliverySectors: z.array(deliverySectorSchema).optional().default([]),
  businessHours: z.array(businessHourSchema),
})

type ProfileFormData = z.infer<typeof profileSchema>

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const DEFAULT_BUSINESS_HOURS = DAYS_OF_WEEK.map((_, index) => ({
  dayOfWeek: index,
  openTime: '18:00',
  closeTime: '23:00',
  isOpen: index !== 0,
}))

async function fetchProfile() {
  const response = await api.get('/public/profile')
  return response.data
}

async function updateProfile(data: ProfileFormData) {
  const response = await api.put('/settings/company-profile', data)
  return response.data
}

function hexToHSL(hex: string) {
  let r = 0
  let g = 0
  let b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

function hslToHex(h: number, s: number, l: number) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generatePremiumPalette(hex: string) {
  const { h, s } = hexToHSL(hex)
  const premiumSecondary = hslToHex(h, Math.min(s, 40), 98)
  const premiumBg = hslToHex(h, Math.min(s, 30), 95)
  return { secondary: premiumSecondary, bg: premiumBg }
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function MenuSettings() {
  const queryClient = useQueryClient()

  const THEMES = [
    { name: 'Neutro', primary: '#475569', secondary: '#ffffff', bg: '#f8fafc' },
    {
      name: 'Vibrante (Laranja)',
      primary: '#f97316',
      secondary: '#ffffff',
      bg: '#fff7ed',
    },
    {
      name: 'Elegante (Preto)',
      primary: '#171717',
      secondary: '#ffffff',
      bg: '#f5f5f5',
    },
    {
      name: 'Natural (Verde)',
      primary: '#16a34a',
      secondary: '#ffffff',
      bg: '#f0fdf4',
    },
    {
      name: 'Oceano (Azul)',
      primary: '#2563eb',
      secondary: '#ffffff',
      bg: '#eff6ff',
    },
    {
      name: 'Romântico (Vermelho)',
      primary: '#dc2626',
      secondary: '#ffffff',
      bg: '#fef2f2',
    },
  ]

  const { data: profile, isLoading: isFetching } = useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchProfile,
  })

  const { data: paymentsList, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: getPayments,
  })

  const { mutate: togglePaymentMenuStatus } = useMutation({
    mutationFn: updatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      toast.success('Forma de pagamento atualizada para o cardápio!')
    },
    onError: () => {
      toast.error('Erro ao atualizar forma de pagamento.')
    },
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useReactHookForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      tradeName: '',
      companyName: '',
      document: '',
      primaryColor: '#FF5722',
      secondaryColor: '#FFFFFF',
      backgroundColor: '#F9F9F9',
      logo_url: '',
      banner_url: '',
      isOpenManual: true,
      whatsappNumber: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
      deliveryFee: 0,
      minOrderValue: 0,
      deliveryTimeMin: 30,
      deliveryTimeMax: 60,
      ifoodMerchantId: '',
      anotaAiApiKey: '',
      pixKey: '',
      availableNeighborhoods: [],
      deliverySectors: [],
      businessHours: DEFAULT_BUSINESS_HOURS,
    },
  })

  useEffect(() => {
    if (profile) {
      const savedHoursMap = new Map(
        (profile.businessHours || []).map((bh: any) => [bh.dayOfWeek, bh]),
      )

      const businessHours = DAYS_OF_WEEK.map((_, index) => {
        const saved = savedHoursMap.get(index)
        return {
          dayOfWeek: index,
          openTime: saved?.openTime || '18:00',
          closeTime: saved?.closeTime || '23:00',
          isOpen: saved?.isOpen ?? index !== 0,
        }
      })

      reset({
        tradeName: profile.tradeName || '',
        companyName: profile.companyName || '',
        document: profile.document || '',
        primaryColor: profile.primaryColor || '#FF5722',
        secondaryColor: profile.secondaryColor || '#FFFFFF',
        backgroundColor: profile.backgroundColor || '#F9F9F9',
        logo_url: profile.logo_url || '',
        banner_url: profile.banner_url || '',
        isOpenManual: profile.isOpenManual ?? true,
        whatsappNumber: profile.whatsappNumber || '',
        street: profile.street || '',
        number: profile.number || '',
        neighborhood: profile.neighborhood || '',
        city: profile.city || '',
        state: profile.state || '',
        zipcode: profile.zipcode || '',
        deliveryFee: profile.deliveryFee ?? 0,
        minOrderValue: profile.minOrderValue ?? 0,
        deliveryTimeMin: profile.deliveryTimeMin ?? 30,
        deliveryTimeMax: profile.deliveryTimeMax ?? 60,
        ifoodMerchantId: profile.ifoodMerchantId || '',
        anotaAiApiKey: profile.anotaAiApiKey || '',
        pixKey: profile.pixKey || '',
        availableNeighborhoods: profile.availableNeighborhoods || [],
        deliverySectors: profile.deliverySectors || [],
        businessHours,
      })
    }
  }, [profile, reset])

  const { mutateAsync: updateProfileFn } = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-profile'] })
      toast.success('Configurações salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar as configurações. Tente novamente.')
    },
  })

  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false)
  const [isSearchingCEP, setIsSearchingCEP] = useState(false)
  const [newNeighborhoodInputs, setNewNeighborhoodInputs] = useState<Record<string, string>>({})
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [unassignedSearch, setUnassignedSearch] = useState('')

  // Calcula quais bairros estão vinculados e quais estão disponíveis no banco
  const rawDeliverySectors = watch('deliverySectors')
  const deliverySectors = useMemo(() => {
    return Array.isArray(rawDeliverySectors) ? rawDeliverySectors : []
  }, [rawDeliverySectors])

  const rawAvailableNeighborhoods = watch('availableNeighborhoods')
  const availableNeighborhoods = useMemo(() => {
    return Array.isArray(rawAvailableNeighborhoods) ? rawAvailableNeighborhoods : []
  }, [rawAvailableNeighborhoods])

  const assignedNeighborhoodsSet = useMemo(() => {
    const set = new Set<string>()
    deliverySectors.forEach((s: any) => {
      const hoods = Array.isArray(s?.neighborhoods) ? s.neighborhoods : []
      hoods.forEach((n: string) => {
        if (n) set.add(String(n).toLowerCase().trim())
      })
    })
    return set
  }, [deliverySectors])

  const unassignedNeighborhoods = useMemo(() => {
    return availableNeighborhoods.filter(
      (n: string) => n && !assignedNeighborhoodsSet.has(String(n).toLowerCase().trim())
    )
  }, [availableNeighborhoods, assignedNeighborhoodsSet])

  const filteredUnassigned = useMemo(() => {
    if (!unassignedSearch.trim()) return unassignedNeighborhoods
    const q = unassignedSearch.toLowerCase()
    return unassignedNeighborhoods.filter((n: string) =>
      String(n).toLowerCase().includes(q)
    )
  }, [unassignedNeighborhoods, unassignedSearch])

  const handleSearchCNPJ = async () => {
    const documentVal = getValues('document') || ''
    const cleaned = documentVal.replace(/\D/g, '')
    if (cleaned.length !== 14) {
      toast.error('Informe um CNPJ válido com 14 dígitos para buscar.')
      return
    }

    setIsSearchingCNPJ(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      setValue(
        'tradeName',
        data.nome_fantasia || data.razao_social || getValues('tradeName'),
      )
      setValue('companyName', data.razao_social || getValues('companyName'))
      setValue('street', data.logradouro || getValues('street'))
      setValue('number', data.numero || getValues('number'))
      setValue('neighborhood', data.bairro || getValues('neighborhood'))
      setValue('city', data.municipio || getValues('city'))
      setValue('state', data.uf || getValues('state'))
      if (data.cep) setValue('zipcode', data.cep)

      toast.success('Dados da empresa preenchidos via BrasilAPI!')
    } catch {
      toast.error('Erro ao consultar CNPJ via BrasilAPI.')
    } finally {
      setIsSearchingCNPJ(false)
    }
  }

  const handleSearchCEP = async () => {
    const zipcodeVal = getValues('zipcode') || ''
    const cleaned = zipcodeVal.replace(/\D/g, '')
    if (cleaned.length !== 8) {
      toast.error('Informe um CEP válido com 8 dígitos para buscar.')
      return
    }

    setIsSearchingCEP(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleaned}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      if (data.street) setValue('street', data.street)
      if (data.neighborhood) setValue('neighborhood', data.neighborhood)
      if (data.city) setValue('city', data.city)
      if (data.state) setValue('state', data.state)

      toast.success('Endereço preenchido via BrasilAPI!')
    } catch {
      try {
        const resVia = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
        const data = await resVia.json()
        if (data.erro) throw new Error()
        if (data.logradouro) setValue('street', data.logradouro)
        if (data.bairro) setValue('neighborhood', data.bairro)
        if (data.localidade) setValue('city', data.localidade)
        if (data.uf) setValue('state', data.uf)
        toast.success('Endereço preenchido via ViaCEP!')
      } catch {
        toast.error('Erro ao consultar CEP.')
      }
    } finally {
      setIsSearchingCEP(false)
    }
  }

  // Importação: apenas adiciona os bairros ao banco de bairros da loja
  const handleImportModalConfirm = (selectedNeighborhoods: string[]) => {
    const rawBank = getValues('availableNeighborhoods')
    const currentBank = Array.isArray(rawBank) ? rawBank : []
    const bankSet = new Set(currentBank.map((n) => n.toLowerCase().trim()))

    const newToAdd = selectedNeighborhoods.filter(
      (n) => !bankSet.has(n.toLowerCase().trim())
    )

    const updatedBank = [...currentBank, ...newToAdd].sort((a, b) =>
      a.localeCompare(b)
    )

    setValue('availableNeighborhoods', updatedBank, { shouldDirty: true })
  }

  const handleAddSector = () => {
    const rawCurrent = getValues('deliverySectors')
    const current = Array.isArray(rawCurrent) ? rawCurrent : []
    const newSector = {
      id: crypto.randomUUID(),
      name: `Setor ${current.length + 1}`,
      fee: 5.0,
      estimatedTimeMin: 30,
      estimatedTimeMax: 50,
      neighborhoods: [],
    }
    setValue('deliverySectors', [...current, newSector], { shouldDirty: true })
    toast.success('Novo setor de entrega criado!')
  }

  const handleRemoveSector = (id: string) => {
    const rawCurrent = getValues('deliverySectors')
    const current = Array.isArray(rawCurrent) ? rawCurrent : []
    setValue('deliverySectors', current.filter((s: any) => s.id !== id), { shouldDirty: true })
    toast.info('Setor de entrega removido.')
  }

  // Vincula um bairro existente no banco a um setor
  const handleLinkNeighborhoodToSector = (sectorId: string, neighborhoodName: string) => {
    if (!neighborhoodName) return
    const rawCurrent = getValues('deliverySectors')
    const current = Array.isArray(rawCurrent) ? rawCurrent : []
    const cleanName = neighborhoodName.trim()
    const cleanLower = cleanName.toLowerCase()

    // Regra de Exclusividade: remove de qualquer outro setor
    const updated = current.map((s: any) => {
      const filtered = (s.neighborhoods || []).filter(
        (n: string) => n.toLowerCase().trim() !== cleanLower
      )
      if (s.id === sectorId) {
        return { ...s, neighborhoods: [...filtered, cleanName] }
      }
      return { ...s, neighborhoods: filtered }
    })

    setValue('deliverySectors', updated, { shouldDirty: true })
    toast.success(`Bairro "${cleanName}" vinculado ao setor!`)
  }

  // Cria e adiciona bairro manualmente ao setor (e ao banco)
  const handleAddManualNeighborhoodToSector = (sectorId: string) => {
    const raw = (newNeighborhoodInputs[sectorId] || '').trim()
    if (!raw) return

    const splitted = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (splitted.length === 0) return

    const rawCurrentSectors = getValues('deliverySectors')
    const currentSectors = Array.isArray(rawCurrentSectors) ? rawCurrentSectors : []
    const rawBank = getValues('availableNeighborhoods')
    const currentBank = Array.isArray(rawBank) ? rawBank : []
    const splittedLower = new Set(splitted.map((s) => s.toLowerCase()))

    // 1. Atualiza os setores com exclusividade
    const updatedSectors = currentSectors.map((s: any) => {
      const remainingNeighborhoods = (s.neighborhoods || []).filter(
        (n: string) => !splittedLower.has(n.toLowerCase().trim())
      )
      if (s.id === sectorId) {
        return { ...s, neighborhoods: [...remainingNeighborhoods, ...splitted] }
      }
      return { ...s, neighborhoods: remainingNeighborhoods }
    })

    // 2. Garante que os novos bairros também estejam no banco geral
    const bankSet = new Set(currentBank.map((n) => n.toLowerCase().trim()))
    const newToBank = splitted.filter((n) => !bankSet.has(n.toLowerCase().trim()))
    const updatedBank = [...currentBank, ...newToBank].sort((a, b) => a.localeCompare(b))

    setValue('deliverySectors', updatedSectors, { shouldDirty: true })
    setValue('availableNeighborhoods', updatedBank, { shouldDirty: true })
    setNewNeighborhoodInputs((prev) => ({ ...prev, [sectorId]: '' }))
  }

  // Remove bairro do setor (ele volta a ficar disponível no banco)
  const handleRemoveNeighborhoodFromSector = (sectorId: string, neighborhood: string) => {
    const rawCurrent = getValues('deliverySectors')
    const current = Array.isArray(rawCurrent) ? rawCurrent : []
    const updated = current.map((s: any) => {
      if (s.id === sectorId) {
        return {
          ...s,
          neighborhoods: (s.neighborhoods || []).filter((n: string) => n !== neighborhood),
        }
      }
      return s
    })
    setValue('deliverySectors', updated, { shouldDirty: true })
  }

  // Exclui bairro do banco geral
  const handleDeleteNeighborhoodFromBank = (neighborhoodName: string) => {
    const rawBank = getValues('availableNeighborhoods')
    const currentBank = Array.isArray(rawBank) ? rawBank : []
    const rawCurrentSectors = getValues('deliverySectors')
    const currentSectors = Array.isArray(rawCurrentSectors) ? rawCurrentSectors : []
    const cleanLower = neighborhoodName.toLowerCase().trim()

    const updatedBank = currentBank.filter((n) => n.toLowerCase().trim() !== cleanLower)
    const updatedSectors = currentSectors.map((s: any) => ({
      ...s,
      neighborhoods: (s.neighborhoods || []).filter(
        (n: string) => n.toLowerCase().trim() !== cleanLower
      ),
    }))

    setValue('availableNeighborhoods', updatedBank, { shouldDirty: true })
    setValue('deliverySectors', updatedSectors, { shouldDirty: true })
    toast.info(`Bairro "${neighborhoodName}" removido.`)
  }

  const copyMondayToWeekdays = () => {
    const hours = getValues('businessHours')
    const monday = hours[1]
    if (!monday) return

    const updated = hours.map((h) => {
      if (h.dayOfWeek >= 1 && h.dayOfWeek <= 5) {
        return {
          ...h,
          openTime: monday.openTime,
          closeTime: monday.closeTime,
          isOpen: monday.isOpen,
        }
      }
      return h
    })
    setValue('businessHours', updated)
    toast.success('Horário de Segunda aplicado para os dias úteis (Seg-Sex)!')
  }

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfileFn(data)
  }

  if (isFetching) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Cardápio & Estabelecimento (White Label)
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Configure informações da loja, zonas de entrega por bairro, horários e integrações.
          </p>
        </div>
      </div>
      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="delivery" className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
            <TabsTrigger
              value="store"
              className="gap-2 text-xs font-bold rounded-xl py-2.5 data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-950 data-[state=checked]:shadow-sm"
            >
              <Store className="h-4 w-4" /> Loja & Visual
            </TabsTrigger>
            <TabsTrigger
              value="delivery"
              className="gap-2 text-xs font-bold rounded-xl py-2.5 data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-950 data-[state=checked]:shadow-sm"
            >
              <Truck className="h-4 w-4" /> Entrega & Bairros
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="gap-2 text-xs font-bold rounded-xl py-2.5 data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-950 data-[state=checked]:shadow-sm"
            >
              <CreditCard className="h-4 w-4" /> Pagamentos
            </TabsTrigger>
            <TabsTrigger
              value="hours"
              className="gap-2 text-xs font-bold rounded-xl py-2.5 data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-950 data-[state=checked]:shadow-sm"
            >
              <Clock className="h-4 w-4" /> Horários
            </TabsTrigger>
            <TabsTrigger
              value="integrations"
              className="gap-2 text-xs font-bold rounded-xl py-2.5 data-[state=checked]:bg-white dark:data-[state=checked]:bg-slate-950 data-[state=checked]:shadow-sm"
            >
              <Sparkles className="h-4 w-4" /> Pix & Integrações
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS DA LOJA & VISUAL */}
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                  Dados do Estabelecimento
                </CardTitle>
                <CardDescription>
                  Informações do perfil da sua empresa para exibições no cardápio e impressões de comandas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tradeName">Nome Fantasia *</Label>
                    <Input
                      id="tradeName"
                      {...register('tradeName')}
                      placeholder="Ex: Marujo Gastrobar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Razão Social</Label>
                    <Input
                      id="companyName"
                      {...register('companyName')}
                      placeholder="Ex: Marujo Alimenticios LTDA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="document">CNPJ / CPF</Label>
                    <div className="flex gap-2">
                      <Input
                        id="document"
                        {...register('document')}
                        placeholder="00.000.000/0001-00"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearchCNPJ}
                        disabled={isSearchingCNPJ}
                        className="shrink-0 gap-1 text-xs"
                        title="Consultar CNPJ via BrasilAPI"
                      >
                        {isSearchingCNPJ ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 text-primary" />
                        )}
                        Buscar CNPJ
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Clique para preencher os dados automaticamente
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">
                      WhatsApp (Recebimento de Pedidos) *
                    </Label>
                    <Input
                      id="whatsappNumber"
                      {...register('whatsappNumber')}
                      placeholder="5511999999999"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Formato: 55 + DDD + Número
                    </p>
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 font-semibold">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> Endereço Completo
                  </Label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="zipcode" className="text-xs">CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          id="zipcode"
                          {...register('zipcode')}
                          placeholder="00000-000"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleSearchCEP}
                          disabled={isSearchingCEP}
                          title="Consultar CEP via BrasilAPI"
                          className="shrink-0"
                        >
                          {isSearchingCEP ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="street" className="text-xs">Logradouro / Rua</Label>
                      <Input
                        id="street"
                        {...register('street')}
                        placeholder="Av. Principal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number" className="text-xs">Número</Label>
                      <Input
                        id="number"
                        {...register('number')}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood" className="text-xs">Bairro</Label>
                      <Input
                        id="neighborhood"
                        {...register('neighborhood')}
                        placeholder="Centro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs">Cidade</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="Vitória"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs">Estado (UF)</Label>
                      <Input
                        id="state"
                        {...register('state')}
                        placeholder="ES"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="h-5 w-5 text-primary" />
                  Identidade Visual & Tema White-Label
                </CardTitle>
                <CardDescription>
                  Personalize as cores, logomarca e capa que serão exibidas para seus clientes no cardápio online.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL da Logomarca</Label>
                    <Input
                      id="logo_url"
                      {...register('logo_url')}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="banner_url">URL do Banner / Capa</Label>
                    <Input
                      id="banner_url"
                      {...register('banner_url')}
                      placeholder="https://exemplo.com/banner.png"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Temas Pré-definidos</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                    {THEMES.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => {
                          setValue('primaryColor', t.primary)
                          setValue('secondaryColor', t.secondary)
                          setValue('backgroundColor', t.bg)
                        }}
                        className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all hover:scale-105"
                      >
                        <div
                          className="h-8 w-8 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: t.primary }}
                        />
                        <span className="text-xs font-semibold">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="primaryColor"
                        {...register('primaryColor')}
                        onChange={(e) => {
                          const val = e.target.value
                          setValue('primaryColor', val)
                          const auto = generatePremiumPalette(val)
                          setValue('secondaryColor', auto.secondary)
                          setValue('backgroundColor', auto.bg)
                        }}
                        className="h-10 w-16 cursor-pointer p-1"
                      />
                      <Input
                        value={watch('primaryColor')}
                        onChange={(e) => setValue('primaryColor', e.target.value)}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Cor Secundária</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="secondaryColor"
                        {...register('secondaryColor')}
                        className="h-10 w-16 cursor-pointer p-1"
                      />
                      <Input
                        value={watch('secondaryColor')}
                        onChange={(e) => setValue('secondaryColor', e.target.value)}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundColor">Cor de Fundo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        id="backgroundColor"
                        {...register('backgroundColor')}
                        className="h-10 w-16 cursor-pointer p-1"
                      />
                      <Input
                        value={watch('backgroundColor')}
                        onChange={(e) => setValue('backgroundColor', e.target.value)}
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pré-visualização do Tema</Label>
                  <div
                    className="flex items-center justify-between rounded-xl border p-4 shadow-sm"
                    style={{ backgroundColor: watch('backgroundColor') }}
                  >
                    <span
                      className="font-bold"
                      style={{ color: watch('primaryColor') }}
                    >
                      Texto Primário
                    </span>
                    <button
                      type="button"
                      className="rounded-lg px-4 py-2 font-bold text-white shadow"
                      style={{ backgroundColor: watch('primaryColor') }}
                    >
                      Botão de Teste
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: REGRAS DE ENTREGA & ZONAS DE BAIRROS */}
          <TabsContent value="delivery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-primary" />
                  Regras Gerais de Entrega
                </CardTitle>
                <CardDescription>
                  Defina os parâmetros padrão de frete, valor mínimo do pedido e prazos estimados.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Taxa de Entrega Padrão (R$)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    step="0.50"
                    {...register('deliveryFee')}
                    placeholder="0.00"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Aplicada para bairros fora dos setores cadastrados
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minOrderValue">Valor Mínimo do Pedido (R$)</Label>
                  <Input
                    id="minOrderValue"
                    type="number"
                    step="1.00"
                    {...register('minOrderValue')}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tempo Estimado (Minutos)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      {...register('deliveryTimeMin')}
                      placeholder="30"
                      className="w-1/2"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      {...register('deliveryTimeMax')}
                      placeholder="60"
                      className="w-1/2"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ex: 30 a 60 minutos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SEÇÃO 1: BANCO DE BAIRROS CADASTRADOS NA LOJA */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-slate-100">
                      <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      Banco de Bairros da Loja
                    </CardTitle>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs">
                      {availableNeighborhoods.length} Bairros no Catálogo
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Bairros que sua loja atende. Você pode importar a cidade toda de uma vez ou cadastrar bairros avulsos.
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="gap-1.5 text-xs font-bold border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Importar Bairros da Cidade
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableNeighborhoods.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/20">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Nenhum bairro importado ainda no banco de bairros.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em &quot;Importar Bairros da Cidade&quot; para carregar todos os bairros do seu município em 1 clique.
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Filtro do banco de bairros */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {unassignedNeighborhoods.length} disponíveis sem setor • {assignedNeighborhoodsSet.size} vinculados a setores
                      </span>
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          placeholder="Buscar bairro disponível..."
                          value={unassignedSearch}
                          onChange={(e) => setUnassignedSearch(e.target.value)}
                          className="h-7 pl-7 text-xs bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>

                    {/* Lista dos bairros disponíveis (sem setor) */}
                    {unassignedNeighborhoods.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/30">
                        {filteredUnassigned.map((name) => (
                          <div
                            key={name}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                          >
                            <span>{name}</span>
                            {deliverySectors.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleLinkNeighborhoodToSector(e.target.value, name)
                                    e.target.value = ''
                                  }
                                }}
                                defaultValue=""
                                className="h-5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-none cursor-pointer px-1 focus:ring-0"
                                title="Vincular a um setor"
                              >
                                <option value="" disabled>+ Setor</option>
                                {deliverySectors.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({formatCurrency(s.fee)})
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteNeighborhoodFromBank(name)}
                              className="text-slate-300 hover:text-red-500 ml-0.5"
                              title="Remover do catálogo"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40">
                        🎉 Todos os {availableNeighborhoods.length} bairros do catálogo já estão distribuídos em seus setores!
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEÇÃO 2: SETORES DE ENTREGA & TAXAS */}
            <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-black text-indigo-950 dark:text-indigo-200">
                    <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    Zonas de Entrega & Taxas por Setor
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Cada setor agrupa bairros com a mesma taxa de frete e tempo de entrega.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={handleAddSector}
                  size="sm"
                  className="gap-1.5 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Novo Setor
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliverySectors.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
                    <MapPin className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                    <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Nenhum setor de entrega configurado
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Crie setores (ex: &quot;Setor 1 - Centro (R$ 6,00)&quot;) e adicione os bairros correspondentes.
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="button"
                        onClick={handleAddSector}
                        size="sm"
                        className="gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 font-bold"
                      >
                        <Plus className="h-4 w-4" /> Criar Primeiro Setor
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {deliverySectors.map((sector: any, sIndex: number) => (
                      <div
                        key={sector.id || sIndex}
                        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-950"
                      >
                        {/* Header do Setor: Nome, Taxa e Prazo */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3.5 dark:border-slate-800">
                          <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nome do Setor</Label>
                              <Input
                                {...register(`deliverySectors.${sIndex}.name`)}
                                placeholder="Ex: Setor 1 - Centro"
                                className="h-9 text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Taxa de Entrega (R$)</Label>
                              <Input
                                type="number"
                                step="0.50"
                                {...register(`deliverySectors.${sIndex}.fee`)}
                                placeholder="6.00"
                                className="h-9 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Prazo Estimado (Min)</Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="number"
                                  {...register(`deliverySectors.${sIndex}.estimatedTimeMin`)}
                                  placeholder="30"
                                  className="h-9 text-xs"
                                />
                                <span className="text-slate-400">-</span>
                                <Input
                                  type="number"
                                  {...register(`deliverySectors.${sIndex}.estimatedTimeMax`)}
                                  placeholder="45"
                                  className="h-9 text-xs"
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSector(sector.id)}
                            className="self-end sm:self-center text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Excluir este setor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Corpo do Setor: Bairros Vinculados & Adição Rápida */}
                        <div className="mt-3 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Bairros vinculados a este setor ({sector.neighborhoods?.length || 0}):
                            </Label>

                            {/* Dropdown Rápido: Adicionar bairro do banco a este setor */}
                            {unassignedNeighborhoods.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-400">Do banco:</span>
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleLinkNeighborhoodToSector(sector.id, e.target.value)
                                      e.target.value = ''
                                    }
                                  }}
                                  defaultValue=""
                                  className="h-7 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 cursor-pointer"
                                >
                                  <option value="" disabled>+ Escolher bairro disponível...</option>
                                  {unassignedNeighborhoods.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Badges de Bairros do Setor */}
                          <div className="flex flex-wrap items-center gap-1.5 min-h-10 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                            {(!sector.neighborhoods || sector.neighborhoods.length === 0) ? (
                              <span className="text-xs text-slate-400 italic">
                                Nenhum bairro vinculado. Selecione um bairro acima ou digite abaixo para cadastrar.
                              </span>
                            ) : (
                              (sector.neighborhoods || []).map((n: string) => (
                                <span
                                  key={n}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-900/60 shadow-sm"
                                >
                                  {n}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNeighborhoodFromSector(sector.id, n)}
                                    className="text-indigo-400 hover:text-red-600 transition-colors"
                                    title="Desvincular do setor"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Digitação Manual de Novos Bairros */}
                          <div className="flex items-center gap-2 pt-1">
                            <Input
                              placeholder="Cadastrar novo bairro direto neste setor (Enter ou vírgula)..."
                              value={newNeighborhoodInputs[sector.id] || ''}
                              onChange={(e) => setNewNeighborhoodInputs((prev) => ({ ...prev, [sector.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                  e.preventDefault()
                                  handleAddManualNeighborhoodToSector(sector.id)
                                }
                              }}
                              className="h-8 text-xs bg-white dark:bg-slate-950"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAddManualNeighborhoodToSector(sector.id)}
                              className="h-8 text-xs px-3 font-bold shrink-0"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: FORMAS DE PAGAMENTO NO DELIVERY */}
          <TabsContent value="payments" className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-slate-100">
                      <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      Formas de Pagamento Aceitas no Cardápio
                    </CardTitle>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs">
                      {(Array.isArray(paymentsList) ? paymentsList : []).filter((p) => p.show_in_menu !== false).length} de {(Array.isArray(paymentsList) ? paymentsList : []).length} Ativas no Delivery
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Marque quais formas de pagamento da sua loja (as mesmas usadas no Caixa) estarão disponíveis para os clientes escolherem no pedido online.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingPayments ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-semibold">Carregando formas de pagamento...</span>
                  </div>
                ) : !paymentsList || paymentsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/20">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Nenhuma forma de pagamento cadastrada na empresa.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Acesse Configurações ➔ Formas de Pagamento para cadastrar opções como Dinheiro, Cartão e Pix.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Array.isArray(paymentsList) ? paymentsList : []).map((payment) => {
                      const isEnabled = payment.show_in_menu !== false
                      const isCash = payment.name.toLowerCase().includes('dinheiro')
                      const isPix = payment.name.toLowerCase().includes('pix')

                      return (
                        <div
                          key={payment.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all shadow-sm ${
                            isEnabled
                              ? 'border-indigo-200 bg-white dark:border-indigo-900/60 dark:bg-slate-950 ring-1 ring-indigo-100 dark:ring-indigo-950/40'
                              : 'border-slate-200 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl flex items-center justify-center ${
                              isEnabled
                                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                            }`}>
                              {isCash ? (
                                <Banknote className="h-5 w-5" />
                              ) : isPix ? (
                                <Wallet className="h-5 w-5" />
                              ) : (
                                <CreditCard className="h-5 w-5" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {payment.name}
                                </h4>
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                  {payment.in_sight ? 'À vista (1x)' : `Até ${payment.installment_limit}x`}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {isEnabled
                                  ? 'Disponível no checkout do cardápio'
                                  : 'Oculto no cardápio (só no caixa físico)'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 pl-3">
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                togglePaymentMenuStatus({
                                  id: payment.id,
                                  data: {
                                    name: payment.name,
                                    installment_limit: payment.installment_limit,
                                    in_sight: payment.in_sight,
                                    account_id: payment.account_id || undefined,
                                    show_in_menu: checked,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: HORÁRIOS DE ATENDIMENTO */}
          <TabsContent value="hours" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-primary" />
                    Horários de Funcionamento (Grade Semanal)
                  </CardTitle>
                  <CardDescription>
                    Defina os horários de abertura e fechamento para cada dia da semana.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyMondayToWeekdays}
                    className="text-xs"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar Seg para Seg-Sex
                  </Button>
                  <div className="flex items-center space-x-2 rounded-lg border bg-slate-50 p-2 dark:bg-slate-900">
                    <Controller
                      name="isOpenManual"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="isOpenManual"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isOpenManual" className="cursor-pointer text-xs font-bold">
                      {watch('isOpenManual') ? '🟢 Loja Aberta (Geral)' : '🔴 Loja Fechada Manualmente'}
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia da Semana</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead>Horário Abertura</TableHead>
                      <TableHead>Horário Fechamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DAYS_OF_WEEK.map((dayName, index) => (
                      <TableRow key={dayName}>
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                          {dayName}
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`businessHours.${index}.isOpen`}
                            control={control}
                            render={({ field }) => (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {field.value ? 'Aberto' : 'Fechado'}
                                </span>
                              </div>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            disabled={!watch(`businessHours.${index}.isOpen`)}
                            {...register(`businessHours.${index}.openTime`)}
                            className="h-9 w-32 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="time"
                            disabled={!watch(`businessHours.${index}.isOpen`)}
                            {...register(`businessHours.${index}.closeTime`)}
                            className="h-9 w-32 text-xs"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: PIX & INTEGRAÇÕES */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Chave Pix & Integrações Marketplaces
                </CardTitle>
                <CardDescription>
                  Configure a chave Pix para geração automática do QR Code no checkout e tokens de integrações.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pixKey" className="font-bold text-emerald-700 dark:text-emerald-400">
                    ⚡ Chave Pix do Estabelecimento (Checkout Online)
                  </Label>
                  <Input
                    id="pixKey"
                    {...register('pixKey')}
                    placeholder="Chave Pix (CPF, CNPJ, Telefone, E-mail ou Chave Aleatória)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Quando preenchida, o sistema gera o QR Code e o Copia e Cola automaticamente na tela de pagamento do cliente.
                  </p>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ifoodMerchantId">iFood Merchant ID</Label>
                    <Input
                      id="ifoodMerchantId"
                      {...register('ifoodMerchantId')}
                      placeholder="Identificador da loja no portal do iFood"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anotaAiApiKey">Anota AI API Key</Label>
                    <Input
                      id="anotaAiApiKey"
                      {...register('anotaAiApiKey')}
                      placeholder="Token de integração Anota AI"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botão Salvar Geral */}
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">
            As alterações são aplicadas imediatamente ao cardápio digital da sua loja.
          </p>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full sm:w-auto font-bold bg-gradient-to-r from-primary to-primary/90 shadow-lg shadow-primary/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </div>
      </form>

      {/* Modal Limpo de Importação de Bairros */}
      <ImportNeighborhoodsModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        initialCity={watch('city') || ''}
        initialState={watch('state') || ''}
        onImport={handleImportModalConfirm}
      />
    </div>
  )
}
