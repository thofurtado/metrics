import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-form-field'
import { Controller, useForm as useReactHookForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

const profileSchema = z.object({
  tradeName: z.string().min(1, 'Nome fantasia é obrigatório'),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  backgroundColor: z.string(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  isOpenManual: z.boolean(),
  whatsappNumber: z.string().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

async function fetchProfile() {
  const response = await api.get('/public/profile')
  return response.data
}

async function updateProfile(data: ProfileFormData) {
  const response = await api.put('/settings/company-profile', data)
  return response.data
}

export function MenuSettings() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading: isFetching } = useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchProfile,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
  } = useReactHookForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      tradeName: '',
      primaryColor: '#475569',
      secondaryColor: '#ffffff',
      backgroundColor: '#f8fafc',
      logo_url: '',
      banner_url: '',
      isOpenManual: true,
      whatsappNumber: '',
    },
  })

  // Set default values when profile is fetched
  import('react').then((React) => {
    React.useEffect(() => {
      if (profile) {
        reset({
          tradeName: profile.tradeName || '',
          primaryColor: profile.primaryColor || '#475569',
          secondaryColor: profile.secondaryColor || '#ffffff',
          backgroundColor: profile.backgroundColor || '#f8fafc',
          logo_url: profile.logo_url || '',
          banner_url: profile.banner_url || '',
          isOpenManual: profile.isOpenManual ?? true,
          whatsappNumber: profile.whatsappNumber || '',
        })
      }
    }, [profile, reset])
  })

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Cardápio (White Label)</h2>
        <p className="text-muted-foreground">
          Gerencie as cores, logo e configurações do seu cardápio digital.
        </p>
      </div>
      <Separator />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual</CardTitle>
            <CardDescription>
              Configure o nome e os links das imagens (em breve upload direto).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tradeName">Nome do Restaurante</Label>
              <Input id="tradeName" {...register('tradeName')} placeholder="Ex: Marujo Gastrobar" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL da Logo</Label>
                <Input id="logo_url" {...register('logo_url')} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner_url">URL do Banner</Label>
                <Input id="banner_url" {...register('banner_url')} placeholder="https://..." />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores (Design Tokens)</CardTitle>
            <CardDescription>
              Ajuste as cores principais para combinar com a sua marca.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="primaryColor">Cor Primária</Label>
              <Input type="color" id="primaryColor" {...register('primaryColor')} className="h-14 w-full p-1 cursor-pointer" />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="secondaryColor">Cor Secundária (Fundo dos cards)</Label>
              <Input type="color" id="secondaryColor" {...register('secondaryColor')} className="h-14 w-full p-1 cursor-pointer" />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="backgroundColor">Fundo (Geral)</Label>
              <Input type="color" id="backgroundColor" {...register('backgroundColor')} className="h-14 w-full p-1 cursor-pointer" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atendimento</CardTitle>
            <CardDescription>
              Regras de funcionamento e recebimento de pedidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
              <Input id="whatsappNumber" {...register('whatsappNumber')} placeholder="Ex: 5511999999999" />
              <p className="text-xs text-muted-foreground">Inclua o código do país (ex: 55) e o DDD.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Aceitar Pedidos</Label>
                <p className="text-sm text-muted-foreground">
                  Se desativado, o cardápio mostrará "Fechado" e bloqueará novos pedidos.
                </p>
              </div>
              <Controller
                control={control}
                name="isOpenManual"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
  )
}
