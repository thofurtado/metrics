import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, FilePen } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createClient } from '@/api/create-client'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

// ====================================================================
// PARTE 1: UTILS E FUNÇÕES AUXILIARES (VALIDAÇÃO E MÁSCARA)
// ====================================================================

/**
 * Função para remover caracteres não numéricos.
 */
const cleanNumber = (value: string | undefined | null): string => {
  return (value || '').replace(/\D/g, '')
}

// Formatação manual (substituindo react-input-mask para evitar warnings de findDOMNode)
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

const formatCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
}

const formatPhone = (value: string) => {
  const clean = cleanNumber(value)
  // (99) 99999-9999
  if (clean.length > 10) {
    return clean
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }
  // (99) 9999-9999
  return clean
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1')
}

// ----------------------------------------
// FUNÇÕES DE VALIDAÇÃO ROBUSTA (DÍGITO VERIFICADOR)
// (Mantidas pois são a base da validação Zod)
// ----------------------------------------

const isValidCpf = (cpf: string): boolean => {
  const cleaned = cleanNumber(cpf)
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false
  let sum, rest
  sum = 0
  for (let i = 1; i <= 9; i++)
    sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i)
  rest = (sum * 10) % 11
  if (rest == 10 || rest == 11) rest = 0
  if (rest != parseInt(cleaned.substring(9, 10))) return false
  sum = 0
  for (let i = 1; i <= 10; i++)
    sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i)
  rest = (sum * 10) % 11
  if (rest == 10 || rest == 11) rest = 0
  return rest == parseInt(cleaned.substring(10, 11))
}

const isValidCnpj = (cnpj: string): boolean => {
  const cleaned = cleanNumber(cnpj)
  if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false
  let length = cleaned.length - 2
  let numbers = cleaned.substring(0, length)
  const digits = cleaned.substring(length)
  let sum = 0
  let pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result != parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cleaned.substring(0, length)
  sum = 0
  pos = length - 7
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result == parseInt(digits.charAt(1))
}

// ====================================================================
// PARTE 2: ZOD SCHEMA
// ====================================================================

const formSchema = z
  .object({
    name: z.string().min(1, 'O nome do cliente é obrigatório.'),

    identification: z
      .string()
      .nullish()
      .or(z.literal(''))
      .refine(
        (val) => {
          if (!val) return true
          const cleaned = cleanNumber(val)
          if (cleaned.length === 11) return isValidCpf(val)
          if (cleaned.length === 14) return isValidCnpj(val)
          return false // Força erro se tiver valor e não for CPF/CNPJ válido
        },
        {
          message: 'CPF ou CNPJ inválido. Verifique o número.',
        },
      ),

    phone: z
      .string()
      .nullish()
      .or(z.literal(''))
      .refine(
        (val) => {
          if (!val) return true
          const cleaned = cleanNumber(val)
          // DD + 8 dígitos (10 total) ou DD + 9 dígitos (11 total)
          return cleaned.length === 10 || cleaned.length === 11
        },
        {
          message: 'Telefone inválido (necessita DDD e 8 ou 9 dígitos).',
        },
      ),

    email: z
      .string()
      .nullish()
      .or(z.literal(''))
      .refine(
        (val) => {
          if (!val) return true
          return z.string().email().safeParse(val).success
        },
        {
          message: 'E-mail em formato inválido.',
        },
      ),

    contract: z.boolean().nullish(),
    isEnterprise: z.boolean().default(false),
    contact: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isEnterprise && !data.contact) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O nome do contato é obrigatório para Pessoa Jurídica.',
        path: ['contact'],
      })
    }
  })

type FormSchemaType = z.infer<typeof formSchema>

interface TreatmentClientProps {
  onClose: () => void
}

// ====================================================================
// PARTE 3: COMPONENTE PRINCIPAL TreatmentClient
// ====================================================================

export function TreatmentClient({ onClose }: TreatmentClientProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutateAsync: client } = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado com sucesso', {
        position: 'top-center',
      })

      onClose() // Fecha o dialog

      setTimeout(() => {
        navigate(window.location.pathname)
      }, 1000)
    },
    onError: () => {
      toast.error('Erro ao cadastrar cliente', {
        position: 'top-center',
      })
    },
  })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      identification: '',
      phone: '',
      email: '',
      contract: false,
      isEnterprise: false,
      contact: '',
    },
    mode: 'onBlur',
  })

  // Watchers
  const isEnterpriseValue = form.watch('isEnterprise')
  const errors = form.formState.errors

  async function onSubmit(data: FormSchemaType) {
    const identificationClean = cleanNumber(data.identification)
    const phoneClean = cleanNumber(data.phone)

    const isEnterprise = data.isEnterprise || false
    const finalContact = isEnterprise ? data.contact : data.name

    await client({
      name: data.name,
      identification: identificationClean || null,
      phone: phoneClean || null,
      email: data.email || null,
      contract: data.contract ? data.contract : false,
      isEnterprise,
      contact: finalContact || undefined,
    })
  }

  const getErrorClass = (fieldName: keyof FormSchemaType) => {
    return errors[fieldName] ? 'border-red-500 focus-visible:ring-red-500' : ''
  }

  return (
    <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Cadastro de Cliente</DialogTitle>
        <DialogDescription>
          Preencha os dados abaixo para cadastrar um novo cliente.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form
          className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-12 sm:gap-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* TIPO DE PESSOA (SWITCH) - TOPO */}
          <div className="flex justify-end sm:col-span-12">
            <FormField
              control={form.control}
              name="isEnterprise"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-gray-100 bg-gray-50/50 p-3 shadow-sm">
                  <div className="flex flex-row items-center space-x-2">
                    <Building2
                      className={`h-5 w-5 ${field.value ? 'text-minsk-600' : 'text-gray-400'}`}
                    />
                    <FormLabel className="cursor-pointer text-sm font-medium text-gray-700">
                      Pessoa Jurídica?
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked)
                        // Limpa identificação ao trocar o tipo para evitar formatos errados
                        form.setValue('identification', '')
                      }}
                      className="data-[state=checked]:bg-minsk-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* NOME (FULL WIDTH) */}
          <div className="sm:col-span-12">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nome Completo / Razão Social *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isEnterpriseValue
                          ? 'Razão Social da Empresa'
                          : 'Nome do Cliente'
                      }
                      className={getErrorClass('name')}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* CPF / CNPJ (MEIA LARGURA) */}
          <div className="sm:col-span-6">
            <FormField
              control={form.control}
              name="identification"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isEnterpriseValue ? 'CNPJ' : 'CPF'}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        isEnterpriseValue
                          ? '00.000.000/0000-00'
                          : '000.000.000-00'
                      }
                      className={getErrorClass('identification')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const formatted = isEnterpriseValue
                          ? formatCNPJ(raw)
                          : formatCPF(raw)
                        field.onChange(formatted)
                      }}
                      onBlur={field.onBlur}
                      maxLength={isEnterpriseValue ? 18 : 14}
                    />
                  </FormControl>
                  {errors.identification && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.identification.message}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* TELEFONE (MEIA LARGURA) */}
          <div className="sm:col-span-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Telefone / Celular</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(99) 99999-9999"
                      className={getErrorClass('phone')}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        field.onChange(formatPhone(e.target.value))
                      }}
                      onBlur={field.onBlur}
                      maxLength={15}
                    />
                  </FormControl>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* E-MAIL (FULL WIDTH OU COL-6 SE TIVER CONTATO) */}
          <div
            className={isEnterpriseValue ? 'sm:col-span-6' : 'sm:col-span-12'}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => {
                const { value, ...fieldProps } = field
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="contato@empresa.com"
                        className={getErrorClass('email')}
                        {...fieldProps}
                        value={value || ''}
                      />
                    </FormControl>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </FormItem>
                )
              }}
            />
          </div>

          {/* CONTATO NA EMPRESA (VISÍVEL APENAS SE PJ) */}
          {isEnterpriseValue && (
            <div className="sm:col-span-6">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pessoa de Contato *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do responsável"
                        className={getErrorClass('contact')}
                        {...field}
                      />
                    </FormControl>
                    {errors.contact && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.contact.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* CONTRATO (BASE) */}
          <div className="border-t pt-4 sm:col-span-12">
            <FormField
              control={form.control}
              name="contract"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-gray-50 p-3 shadow-sm dark:bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold">
                      Contrato de Fidelidade
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Este cliente possui contrato ativo?
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-vida-loca-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* BOTÃO SUBMIT */}
          <div className="flex justify-end pt-2 sm:col-span-12">
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-minsk-500 to-minsk-600 font-semibold text-white shadow-md transition-all hover:from-minsk-600 hover:to-minsk-700 active:scale-95 sm:w-auto"
            >
              <FilePen className="mr-2 h-4 w-4" />
              {isEnterpriseValue ? 'Cadastrar Empresa' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}
