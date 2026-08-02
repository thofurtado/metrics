import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-form-field'
import { Controller, useForm as useReactHookForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Palette } from 'lucide-react'

import { api } from '@/lib/axios'
import { cn } from '@/lib/utils'
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

// Função para converter HEX para HSL e gerar fundos super premium
function hexToHSL(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePremiumPalette(hex: string) {
  const { h, s } = hexToHSL(hex);
  // Fundo dos cards (Secondary): Extremamente claro, quase branco, mas com um toque refinado da cor da marca
  const premiumSecondary = hslToHex(h, Math.min(s, 40), 98);
  // Fundo da página (Background): Um pouco mais escuro que o card para dar profundidade elegante
  const premiumBg = hslToHex(h, Math.min(s, 30), 95);
  return { secondary: premiumSecondary, bg: premiumBg };
}

export function MenuSettings() {
  const queryClient = useQueryClient()

  const THEMES = [
    { name: 'Neutro', primary: '#475569', secondary: '#ffffff', bg: '#f8fafc' },
    { name: 'Vibrante (Laranja)', primary: '#f97316', secondary: '#ffffff', bg: '#fff7ed' },
    { name: 'Elegante (Preto)', primary: '#171717', secondary: '#ffffff', bg: '#f5f5f5' },
    { name: 'Natural (Verde)', primary: '#16a34a', secondary: '#ffffff', bg: '#f0fdf4' },
    { name: 'Oceano (Azul)', primary: '#2563eb', secondary: '#ffffff', bg: '#eff6ff' },
    { name: 'Romântico (Vermelho)', primary: '#dc2626', secondary: '#ffffff', bg: '#fef2f2' },
  ]

  const { data: profile, isLoading: isFetching } = useQuery({
    queryKey: ['company-profile'],
    queryFn: fetchProfile,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    watch,
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
  useEffect(() => {
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
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Identidade Visual (Cores)
            </CardTitle>
            <CardDescription>
              Escolha uma paleta de cores predefinida ou selecione a sua cor principal (as cores de fundo se ajustarão automaticamente).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => {
                    reset({
                      ...getValues(),
                      primaryColor: theme.primary,
                      secondaryColor: theme.secondary,
                      backgroundColor: theme.bg,
                    })
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    borderColor: watch('primaryColor') === theme.primary ? theme.primary : 'transparent',
                    backgroundColor: watch('primaryColor') === theme.primary ? theme.bg : undefined,
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: theme.primary }} />
                  <span className="text-sm font-medium text-slate-700">{theme.name}</span>
                </button>
              ))}
            </div>

            <Separator />

            <div className="flex flex-col space-y-3 pt-2">
              <Label htmlFor="primaryColor" className="text-base">Ou defina sua cor principal personalizada:</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="color" 
                  id="primaryColor" 
                  {...register('primaryColor')} 
                  onChange={(e) => {
                    const primary = e.target.value;
                    const { secondary, bg } = generatePremiumPalette(primary);
                    
                    reset({
                      ...getValues(),
                      primaryColor: primary,
                      secondaryColor: secondary, 
                      backgroundColor: bg, 
                    })
                  }}
                  className="h-14 w-24 p-1 cursor-pointer" 
                />
                <p className="text-sm text-muted-foreground flex-1">
                  Ao escolher sua cor primária, nós ajustamos as cores de fundo automaticamente para garantir que os textos fiquem legíveis!
                </p>
              </div>
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
